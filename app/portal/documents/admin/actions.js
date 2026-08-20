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

async function requireUser() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  return {
    supabase,
    user,
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
  } =
    await requireUser();

  const admin =
    createAdminClient();

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
    `${folder}/${fileName}`;

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
  await requireUser();

  const admin =
    createAdminClient();

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
    const folder =
      safeFolderName(
        standard
      );

    fileName =
      safeFileName(
        replacementFile.name
      );

    filePath =
      `${folder}/${fileName}`;

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
  await requireUser();

  const admin =
    createAdminClient();

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
  await requireUser();

  const admin =
    createAdminClient();

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
