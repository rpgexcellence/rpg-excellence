"use server";

import {
  revalidatePath,
} from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

const DOCUMENT_TYPES = [
  "Procedure",
  "Form",
  "Report",
  "Script",
  "Guidance",
  "Template",
  "Policy",
  "Other",
];

const STATUSES = [
  "Draft",
  "Current",
  "Superseded",
  "Withdrawn",
];

const AUDIENCES = [
  "Customer",
  "Internal",
  "Both",
];

const BUCKET =
  "controlled-documents";

function cleanText(value) {
  if (
    typeof value !==
      "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  return value.trim();
}

function safeFolderName(value) {
  return (
    cleanText(value)
      ?.replaceAll(":", "-")
      .replaceAll("/", "-")
      .replace(/\s+/g, "-") ||
    "RPG-General"
  );
}

function safeFileName(name) {
  return name
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_");
}


function safePathSegment(value) {
  return (
    cleanText(value)
      ?.replace(/\s+/g, "-")
      .replace(/[^A-Za-z0-9._-]/g, "-") ||
    "unknown"
  );
}

function revisionStoragePath({
  standard,
  documentNumber,
  revision,
  fileName,
}) {
  const family =
    safeFolderName(standard);

  const number =
    safePathSegment(
      documentNumber
    );

  const revisionFolder =
    `rev-${safePathSegment(revision)}`;

  return `${family}/${number}/${revisionFolder}/${fileName}`;
}

async function supersedeOtherCurrentRevisions({
  admin,
  documentNumber,
  exceptDocumentId,
}) {
  const now =
    new Date().toISOString();

  let query =
    admin
      .from(
        "controlled_documents"
      )
      .update({
        status: "Superseded",
        superseded_at: now,
        updated_at: now,
      })
      .eq(
        "document_number",
        documentNumber
      )
      .eq(
        "status",
        "Current"
      );

  if (exceptDocumentId) {
    query =
      query.neq(
        "id",
        exceptDocumentId
      );
  }

  const {
    error,
  } = await query;

  if (error) {
    throw new Error(
      error.message
    );
  }
}

async function requireDocumentAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const admin =
    createAdminClient();

  const {
    data: adminAccess,
    error: adminAccessError,
  } = await admin
    .from("portal_admins")
    .select("role, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .in("role", [
      "admin",
      "document_controller",
    ])
    .maybeSingle();

  if (
    adminAccessError ||
    !adminAccess
  ) {
    redirect("/portal/documents");
  }

  return {
    supabase,
    user,
    admin,
    adminAccess,
  };
}

function validateControlledValues({
  documentType,
  status,
  audience,
}) {
  if (
    !DOCUMENT_TYPES.includes(
      documentType
    )
  ) {
    throw new Error(
      "Invalid document type."
    );
  }

  if (
    !STATUSES.includes(
      status
    )
  ) {
    throw new Error(
      "Invalid document status."
    );
  }

  if (
    !AUDIENCES.includes(
      audience
    )
  ) {
    throw new Error(
      "Invalid document audience."
    );
  }
}

export async function createControlledDocument(
  formData
) {
  const {
    user,
    admin,
  } =
    await requireDocumentAdmin();

  const documentNumber =
    cleanText(
      formData.get(
        "document_number"
      )
    );

  const title =
    cleanText(
      formData.get("title")
    );

  const documentType =
    cleanText(
      formData.get(
        "document_type"
      )
    );

  const standard =
    cleanText(
      formData.get("standard")
    );

  const revision =
    cleanText(
      formData.get("revision")
    );

  const status =
    cleanText(
      formData.get("status")
    ) || "Draft";

  const audience =
    cleanText(
      formData.get("audience")
    ) || "Customer";

  if (
    !documentNumber ||
    !title ||
    !documentType ||
    !revision
  ) {
    throw new Error(
      "Document number, title, type and revision are required."
    );
  }

  validateControlledValues({
    documentType,
    status,
    audience,
  });

  const file =
    formData.get("file");

  if (
    !file ||
    typeof file === "string" ||
    file.size === 0
  ) {
    throw new Error(
      "A document file is required."
    );
  }

  const folder =
    safeFolderName(
      standard
    );

  const fileName =
    safeFileName(
      file.name
    );

  const filePath =
    revisionStoragePath({
      standard,
      documentNumber,
      revision,
      fileName,
    });

  const {
    error: uploadError,
  } =
    await admin.storage
      .from(BUCKET)
      .upload(
        filePath,
        file,
        {
          upsert: false,
          contentType:
            file.type ||
            undefined,
        }
      );

  if (uploadError) {
    throw new Error(
      uploadError.message
    );
  }

  const {
    error: insertError,
  } = await admin
    .from(
      "controlled_documents"
    )
    .insert({
      document_number:
        documentNumber,
      title,
      document_type:
        documentType,
      standard,
      revision,
      status,
      audience,
      issue_date:
        cleanText(
          formData.get(
            "issue_date"
          )
        ),
      review_date:
        cleanText(
          formData.get(
            "review_date"
          )
        ),
      description:
        cleanText(
          formData.get(
            "description"
          )
        ),
      notes:
        cleanText(
          formData.get("notes")
        ),
      file_name:
        fileName,
      file_path:
        filePath,
      storage_bucket:
        BUCKET,
      created_by:
        user.id,
      approved_by:
        cleanText(
          formData.get(
            "approved_by"
          )
        ),
      approved_at:
        status === "Current"
          ? new Date().toISOString()
          : null,
      updated_at:
        new Date().toISOString(),
    });

  if (insertError) {
    await admin.storage
      .from(BUCKET)
      .remove([filePath]);

    throw new Error(
      insertError.message
    );
  }

  if (status === "Current") {
    const {
      data: createdDocument,
      error: createdLookupError,
    } = await admin
      .from("controlled_documents")
      .select("id")
      .eq(
        "document_number",
        documentNumber
      )
      .eq(
        "revision",
        revision
      )
      .single();

    if (
      createdLookupError ||
      !createdDocument
    ) {
      throw new Error(
        createdLookupError?.message ||
        "Unable to identify created document."
      );
    }

    await supersedeOtherCurrentRevisions({
      admin,
      documentNumber,
      exceptDocumentId:
        createdDocument.id,
    });
  }

  revalidatePath(
    "/portal/documents"
  );

  revalidatePath(
    "/portal/documents/admin"
  );

  redirect(
    "/portal/documents/admin"
  );
}

export async function updateControlledDocument(
  formData
) {
  const {
    admin,
  } =
    await requireDocumentAdmin();

  const documentId =
    cleanText(
      formData.get(
        "document_id"
      )
    );

  if (!documentId) {
    throw new Error(
      "Missing document ID."
    );
  }

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from(
      "controlled_documents"
    )
    .select("*")
    .eq(
      "id",
      documentId
    )
    .single();

  if (
    existingError ||
    !existing
  ) {
    throw new Error(
      "Document not found."
    );
  }

  const title =
    cleanText(
      formData.get("title")
    );

  const documentType =
    cleanText(
      formData.get(
        "document_type"
      )
    );

  const standard =
    cleanText(
      formData.get("standard")
    );

  const status =
    cleanText(
      formData.get("status")
    );

  const audience =
    cleanText(
      formData.get("audience")
    );

  validateControlledValues({
    documentType,
    status,
    audience,
  });

  const replacementFile =
    formData.get(
      "replacement_file"
    );

  let fileName =
    existing.file_name;

  let filePath =
    existing.file_path;

  if (
    replacementFile &&
    typeof replacementFile !==
      "string" &&
    replacementFile.size > 0
  ) {
    fileName =
      safeFileName(
        replacementFile.name
      );

    filePath =
      revisionStoragePath({
        standard,
        documentNumber:
          existing.document_number,
        revision:
          existing.revision,
        fileName,
      });

    const {
      error: uploadError,
    } =
      await admin.storage
        .from(BUCKET)
        .upload(
          filePath,
          replacementFile,
          {
            upsert: true,
            contentType:
              replacementFile.type ||
              undefined,
          }
        );

    if (uploadError) {
      throw new Error(
        uploadError.message
      );
    }

    if (
      existing.file_path &&
      existing.file_path !==
        filePath
    ) {
      await admin.storage
        .from(
          existing.storage_bucket ||
          BUCKET
        )
        .remove([
          existing.file_path,
        ]);
    }
  }

  const now =
    new Date().toISOString();

  if (status === "Current") {
    await supersedeOtherCurrentRevisions({
      admin,
      documentNumber:
        existing.document_number,
      exceptDocumentId:
        documentId,
    });
  }

  const {
    error: updateError,
  } = await admin
    .from(
      "controlled_documents"
    )
    .update({
      title,
      document_type:
        documentType,
      standard,
      status,
      audience,
      issue_date:
        cleanText(
          formData.get(
            "issue_date"
          )
        ),
      review_date:
        cleanText(
          formData.get(
            "review_date"
          )
        ),
      description:
        cleanText(
          formData.get(
            "description"
          )
        ),
      notes:
        cleanText(
          formData.get("notes")
        ),
      approved_by:
        cleanText(
          formData.get(
            "approved_by"
          )
        ),
      approved_at:
        status === "Current"
          ? existing.approved_at ||
            now
          : existing.approved_at,
      superseded_at:
        status ===
        "Superseded"
          ? existing.superseded_at ||
            now
          : null,
      withdrawn_at:
        status ===
        "Withdrawn"
          ? existing.withdrawn_at ||
            now
          : null,
      file_name:
        fileName,
      file_path:
        filePath,
      storage_bucket:
        existing.storage_bucket ||
        BUCKET,
      updated_at:
        now,
    })
    .eq(
      "id",
      documentId
    );

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  revalidatePath(
    "/portal/documents"
  );

  revalidatePath(
    "/portal/documents/admin"
  );

  redirect(
    "/portal/documents/admin"
  );
}

export async function supersedeControlledDocument(
  formData
) {
  const {
    admin,
  } =
    await requireDocumentAdmin();

  const documentId =
    cleanText(
      formData.get(
        "document_id"
      )
    );

  if (!documentId) {
    throw new Error(
      "Missing document ID."
    );
  }

  const now =
    new Date().toISOString();

  const {
    error,
  } = await admin
    .from(
      "controlled_documents"
    )
    .update({
      status:
        "Superseded",
      superseded_at:
        now,
      updated_at:
        now,
    })
    .eq(
      "id",
      documentId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    "/portal/documents"
  );

  revalidatePath(
    "/portal/documents/admin"
  );

  redirect(
    "/portal/documents/admin"
  );
}

export async function withdrawControlledDocument(
  formData
) {
  const {
    admin,
  } =
    await requireDocumentAdmin();

  const documentId =
    cleanText(
      formData.get(
        "document_id"
      )
    );

  if (!documentId) {
    throw new Error(
      "Missing document ID."
    );
  }

  const now =
    new Date().toISOString();

  const {
    error,
  } = await admin
    .from(
      "controlled_documents"
    )
    .update({
      status:
        "Withdrawn",
      withdrawn_at:
        now,
      updated_at:
        now,
    })
    .eq(
      "id",
      documentId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    "/portal/documents"
  );

  revalidatePath(
    "/portal/documents/admin"
  );

  redirect(
    "/portal/documents/admin"
  );
}


export async function createDocumentRevision(
  formData
) {
  const {
    user,
    admin,
  } =
    await requireDocumentAdmin();

  const sourceDocumentId =
    cleanText(
      formData.get(
        "source_document_id"
      )
    );

  const newRevision =
    cleanText(
      formData.get(
        "new_revision"
      )
    );

  const newStatus =
    cleanText(
      formData.get(
        "new_status"
      )
    ) || "Draft";

  const newAudience =
    cleanText(
      formData.get(
        "new_audience"
      )
    );

  if (
    !sourceDocumentId ||
    !newRevision
  ) {
    throw new Error(
      "Source document and new revision are required."
    );
  }

  if (
    ![
      "Draft",
      "Current",
    ].includes(
      newStatus
    )
  ) {
    throw new Error(
      "New revisions may be created as Draft or Current only."
    );
  }

  if (
    !AUDIENCES.includes(
      newAudience
    )
  ) {
    throw new Error(
      "Invalid document audience."
    );
  }

  const {
    data: source,
    error: sourceError,
  } = await admin
    .from(
      "controlled_documents"
    )
    .select("*")
    .eq(
      "id",
      sourceDocumentId
    )
    .single();

  if (
    sourceError ||
    !source
  ) {
    throw new Error(
      "Source document not found."
    );
  }

  const {
    data: existingRevision,
    error: existingRevisionError,
  } = await admin
    .from(
      "controlled_documents"
    )
    .select("id")
    .eq(
      "document_number",
      source.document_number
    )
    .eq(
      "revision",
      newRevision
    )
    .maybeSingle();

  if (existingRevisionError) {
    throw new Error(
      existingRevisionError.message
    );
  }

  if (existingRevision) {
    throw new Error(
      `Revision ${newRevision} already exists for ${source.document_number}.`
    );
  }

  const file =
    formData.get(
      "revision_file"
    );

  if (
    !file ||
    typeof file === "string" ||
    file.size === 0
  ) {
    throw new Error(
      "A file is required for the new revision."
    );
  }

  const fileName =
    safeFileName(
      file.name
    );

  const filePath =
    revisionStoragePath({
      standard:
        source.standard,
      documentNumber:
        source.document_number,
      revision:
        newRevision,
      fileName,
    });

  const {
    error: uploadError,
  } =
    await admin.storage
      .from(
        source.storage_bucket ||
        BUCKET
      )
      .upload(
        filePath,
        file,
        {
          upsert: false,
          contentType:
            file.type ||
            undefined,
        }
      );

  if (uploadError) {
    throw new Error(
      uploadError.message
    );
  }

  const now =
    new Date().toISOString();

  const {
    data: createdRevision,
    error: insertError,
  } = await admin
    .from(
      "controlled_documents"
    )
    .insert({
      document_number:
        source.document_number,
      title:
        source.title,
      document_type:
        source.document_type,
      standard:
        source.standard,
      revision:
        newRevision,
      status:
        newStatus,
      audience:
        newAudience,
      issue_date:
        cleanText(
          formData.get(
            "new_issue_date"
          )
        ),
      review_date:
        cleanText(
          formData.get(
            "new_review_date"
          )
        ),
      description:
        cleanText(
          formData.get(
            "new_description"
          )
        ) ??
        source.description,
      notes:
        cleanText(
          formData.get(
            "revision_notes"
          )
        ),
      file_name:
        fileName,
      file_path:
        filePath,
      storage_bucket:
        source.storage_bucket ||
        BUCKET,
      supersedes_document_id:
        source.id,
      created_by:
        user.id,
      approved_by:
        cleanText(
          formData.get(
            "new_approved_by"
          )
        ),
      approved_at:
        newStatus ===
        "Current"
          ? now
          : null,
      updated_at:
        now,
    })
    .select("id")
    .single();

  if (insertError) {
    await admin.storage
      .from(
        source.storage_bucket ||
        BUCKET
      )
      .remove([
        filePath,
      ]);

    throw new Error(
      insertError.message
    );
  }

  if (
    newStatus ===
    "Current"
  ) {
    await supersedeOtherCurrentRevisions({
      admin,
      documentNumber:
        source.document_number,
      exceptDocumentId:
        createdRevision.id,
    });
  }

  revalidatePath(
    "/portal/documents"
  );

  revalidatePath(
    "/portal/documents/admin"
  );

  redirect(
    "/portal/documents/admin"
  );
}
