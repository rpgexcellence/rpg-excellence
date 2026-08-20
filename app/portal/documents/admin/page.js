import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import {
  createControlledDocument,
  createDocumentRevision,
  updateControlledDocument,
  supersedeControlledDocument,
  withdrawControlledDocument,
} from "./actions";

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

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function DocumentAdminPage() {
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

  const {
    data: documentsData,
    error: documentsError,
  } = await admin
    .from("controlled_documents")
    .select("*")
    .order("document_number", {
      ascending: true,
    })
    .order("revision", {
      ascending: false,
    });

  if (documentsError) {
    throw new Error(
      documentsError.message
    );
  }

  const documents =
    documentsData ?? [];

  const currentCount =
    documents.filter(
      (document) =>
        document.status ===
        "Current"
    ).length;

  const draftCount =
    documents.filter(
      (document) =>
        document.status ===
        "Draft"
    ).length;

  const supersededCount =
    documents.filter(
      (document) =>
        document.status ===
        "Superseded"
    ).length;

  const withdrawnCount =
    documents.filter(
      (document) =>
        document.status ===
        "Withdrawn"
    ).length;


  const revisionFamilies =
    Object.values(
      documents.reduce(
        (groups, document) => {
          const key =
            document.document_number;

          if (!groups[key]) {
            groups[key] = {
              documentNumber:
                key,
              title:
                document.title,
              revisions: [],
            };
          }

          groups[key].revisions.push(
            document
          );

          return groups;
        },
        {}
      )
    );

  const multiRevisionFamilies =
    revisionFamilies.filter(
      (family) =>
        family.revisions.length > 1
    ).length;

  const inputStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border:
      "1px solid #d8e0ea",
    boxSizing: "border-box",
    background: "#ffffff",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6f9",
        padding: "40px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: "20px",
            alignItems:
              "flex-start",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <div>
            <div
              style={{
                color: "#1459D9",
                fontWeight: 800,
                fontSize: "12px",
                letterSpacing:
                  ".8px",
                marginBottom: "8px",
              }}
            >
              RPG INTELLIGENCE
            </div>

            <h1
              style={{
                color: "#071A33",
                margin: 0,
              }}
            >
              Document Control Admin
            </h1>

            <p
              style={{
                color: "#617087",
                marginBottom: 0,
              }}
            >
              Manage controlled document
              metadata, revisions, status,
              audience and private storage.
            </p>

            <div
              style={{
                marginTop: "9px",
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: "999px",
                background: "#eef4ff",
                color: "#1459D9",
                fontWeight: 800,
                fontSize: "12px",
              }}
            >
              {adminAccess.role === "admin"
                ? "RPG Administrator"
                : "Document Controller"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/portal/documents"
              style={{
                padding: "11px 16px",
                borderRadius: "8px",
                border:
                  "1px solid #d8e0ea",
                background: "#ffffff",
                color: "#071A33",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              ← Document Register
            </Link>

            <Link
              href="/portal"
              style={{
                padding: "11px 16px",
                borderRadius: "8px",
                background: "#071A33",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Dashboard
            </Link>
          </div>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          {[
            ["CURRENT", currentCount],
            ["DRAFT", draftCount],
            ["SUPERSEDED", supersededCount],
            ["WITHDRAWN", withdrawnCount],
            [
              "REVISION HISTORIES",
              multiRevisionFamilies,
            ],
          ].map(
            ([label, value]) => (
              <div
                key={label}
                style={{
                  background: "#ffffff",
                  border:
                    "1px solid #dfe6ee",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    color: "#617087",
                    fontSize: "11px",
                    fontWeight: 800,
                    marginBottom: "7px",
                  }}
                >
                  {label}
                </div>

                <strong
                  style={{
                    color: "#071A33",
                    fontSize: "28px",
                  }}
                >
                  {value}
                </strong>
              </div>
            )
          )}
        </section>

        <section
          style={{
            background: "#ffffff",
            border:
              "1px solid #dfe6ee",
            borderRadius: "14px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              color: "#071A33",
              marginTop: 0,
            }}
          >
            Add Controlled Document
          </h2>

          <form
            action={createControlledDocument}
            encType="multipart/form-data"
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              <input
                name="document_number"
                required
                placeholder="Document number"
                style={inputStyle}
              />

              <input
                name="title"
                required
                placeholder="Document title"
                style={inputStyle}
              />

              <select
                name="document_type"
                required
                defaultValue=""
                style={inputStyle}
              >
                <option value="" disabled>
                  Document type
                </option>

                {DOCUMENT_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}
              </select>

              <input
                name="standard"
                placeholder="Standard / family"
                style={inputStyle}
              />

              <input
                name="revision"
                defaultValue="1.0"
                placeholder="Revision"
                required
                style={inputStyle}
              />

              <select
                name="status"
                defaultValue="Draft"
                style={inputStyle}
              >
                {STATUSES.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}
              </select>

              <select
                name="audience"
                defaultValue="Customer"
                style={inputStyle}
              >
                {AUDIENCES.map(
                  (audience) => (
                    <option
                      key={audience}
                      value={audience}
                    >
                      {audience}
                    </option>
                  )
                )}
              </select>

              <input
                name="issue_date"
                type="date"
                style={inputStyle}
              />

              <input
                name="review_date"
                type="date"
                style={inputStyle}
              />

              <input
                name="approved_by"
                placeholder="Approved by"
                style={inputStyle}
              />
            </div>

            <textarea
              name="description"
              rows="3"
              placeholder="Description"
              style={inputStyle}
            />

            <textarea
              name="notes"
              rows="2"
              placeholder="Internal notes"
              style={inputStyle}
            />

            <input
              name="file"
              type="file"
              required
              style={inputStyle}
            />

            <button
              type="submit"
              style={{
                justifySelf: "start",
                padding: "11px 17px",
                border: "none",
                borderRadius: "8px",
                background: "#1459D9",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Upload & Register Document
            </button>
          </form>
        </section>

        <div
          style={{
            display: "grid",
            gap: "18px",
          }}
        >
          {documents.map(
            (document) => (
              <section
                key={document.id}
                style={{
                  background: "#ffffff",
                  border:
                    "1px solid #dfe6ee",
                  borderRadius: "14px",
                  padding: "22px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: "16px",
                    flexWrap: "wrap",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        color: "#071A33",
                        fontSize: "17px",
                      }}
                    >
                      {document.document_number}
                      {" · "}
                      Rev {document.revision}
                    </strong>

                    <div
                      style={{
                        color: "#617087",
                        marginTop: "4px",
                      }}
                    >
                      {document.title}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: "999px",
                        background:
                          document.status === "Current"
                            ? "#edf8f3"
                            : document.status === "Draft"
                            ? "#eef4ff"
                            : "#f3f6f9",
                        color:
                          document.status === "Current"
                            ? "#16794b"
                            : "#475467",
                        fontWeight: 800,
                        fontSize: "12px",
                      }}
                    >
                      {document.status}
                    </span>

                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: "999px",
                        background: "#f7f9fc",
                        color: "#475467",
                        fontWeight: 800,
                        fontSize: "12px",
                      }}
                    >
                      {document.audience}
                    </span>
                  </div>
                </div>

                <form
                  action={updateControlledDocument}
                  encType="multipart/form-data"
                  style={{
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <input
                    type="hidden"
                    name="document_id"
                    value={document.id}
                  />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <input
                      name="title"
                      defaultValue={
                        document.title ??
                        ""
                      }
                      required
                      style={inputStyle}
                    />

                    <select
                      name="document_type"
                      defaultValue={
                        document.document_type
                      }
                      style={inputStyle}
                    >
                      {DOCUMENT_TYPES.map(
                        (type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {type}
                          </option>
                        )
                      )}
                    </select>

                    <input
                      name="standard"
                      defaultValue={
                        document.standard ??
                        ""
                      }
                      placeholder="Standard / family"
                      style={inputStyle}
                    />

                    <select
                      name="status"
                      defaultValue={
                        document.status
                      }
                      style={inputStyle}
                    >
                      {STATUSES.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        )
                      )}
                    </select>

                    <select
                      name="audience"
                      defaultValue={
                        document.audience
                      }
                      style={inputStyle}
                    >
                      {AUDIENCES.map(
                        (audience) => (
                          <option
                            key={audience}
                            value={audience}
                          >
                            {audience}
                          </option>
                        )
                      )}
                    </select>

                    <input
                      name="issue_date"
                      type="date"
                      defaultValue={
                        document.issue_date ??
                        ""
                      }
                      style={inputStyle}
                    />

                    <input
                      name="review_date"
                      type="date"
                      defaultValue={
                        document.review_date ??
                        ""
                      }
                      style={inputStyle}
                    />

                    <input
                      name="approved_by"
                      defaultValue={
                        document.approved_by ??
                        ""
                      }
                      placeholder="Approved by"
                      style={inputStyle}
                    />
                  </div>

                  <textarea
                    name="description"
                    rows="3"
                    defaultValue={
                      document.description ??
                      ""
                    }
                    style={inputStyle}
                  />

                  <textarea
                    name="notes"
                    rows="2"
                    defaultValue={
                      document.notes ??
                      ""
                    }
                    placeholder="Internal notes"
                    style={inputStyle}
                  />

                  <input
                    name="replacement_file"
                    type="file"
                    style={inputStyle}
                  />

                  <div
                    style={{
                      color: "#617087",
                      fontSize: "12px",
                    }}
                  >
                    File:{" "}
                    {document.file_name ||
                      "—"}{" "}
                    · Issue date:{" "}
                    {formatDate(
                      document.issue_date
                    )}
                  </div>

                  {document.supersedes_document_id && (
                    <div
                      style={{
                        color: "#617087",
                        fontSize: "12px",
                      }}
                    >
                      Revision history:
                      this revision supersedes
                      an earlier controlled
                      revision.
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{
                      justifySelf: "start",
                      padding: "10px 15px",
                      border: "none",
                      borderRadius: "8px",
                      background: "#071A33",
                      color: "#ffffff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Save Document Changes
                  </button>
                </form>

                {document.status === "Current" && (
                  <details
                    style={{
                      marginTop: "16px",
                      border:
                        "1px solid #dfe6ee",
                      borderRadius: "10px",
                      overflow: "hidden",
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        padding: "13px 15px",
                        background: "#f5f8fc",
                        color: "#071A33",
                        fontWeight: 800,
                      }}
                    >
                      Create New Revision
                    </summary>

                    <form
                      action={
                        createDocumentRevision
                      }
                      encType="multipart/form-data"
                      style={{
                        display: "grid",
                        gap: "12px",
                        padding: "16px",
                      }}
                    >
                      <input
                        type="hidden"
                        name="source_document_id"
                        value={document.id}
                      />

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(210px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        <input
                          name="new_revision"
                          required
                          placeholder="New revision, e.g. 1.1 or 2.0"
                          style={inputStyle}
                        />

                        <select
                          name="new_status"
                          defaultValue="Draft"
                          style={inputStyle}
                        >
                          <option value="Draft">
                            Draft
                          </option>
                          <option value="Current">
                            Current
                          </option>
                        </select>

                        <select
                          name="new_audience"
                          defaultValue={
                            document.audience
                          }
                          style={inputStyle}
                        >
                          {AUDIENCES.map(
                            (audience) => (
                              <option
                                key={audience}
                                value={audience}
                              >
                                {audience}
                              </option>
                            )
                          )}
                        </select>

                        <input
                          name="new_issue_date"
                          type="date"
                          style={inputStyle}
                        />

                        <input
                          name="new_review_date"
                          type="date"
                          style={inputStyle}
                        />

                        <input
                          name="new_approved_by"
                          defaultValue={
                            document.approved_by ??
                            ""
                          }
                          placeholder="Approved by"
                          style={inputStyle}
                        />
                      </div>

                      <textarea
                        name="new_description"
                        rows="3"
                        defaultValue={
                          document.description ??
                          ""
                        }
                        placeholder="Description"
                        style={inputStyle}
                      />

                      <textarea
                        name="revision_notes"
                        rows="2"
                        placeholder="Revision summary / reason for change"
                        style={inputStyle}
                      />

                      <input
                        name="revision_file"
                        type="file"
                        required
                        style={inputStyle}
                      />

                      <div
                        style={{
                          background: "#eef4ff",
                          border:
                            "1px solid #d6e4ff",
                          color: "#405574",
                          borderRadius: "8px",
                          padding: "12px 14px",
                          lineHeight: 1.5,
                          fontSize: "13px",
                        }}
                      >
                        Creating a Draft keeps
                        Rev {document.revision}
                        current. Creating the new
                        revision as Current will
                        automatically supersede
                        the existing current
                        revision while preserving
                        its file and history.
                      </div>

                      <button
                        type="submit"
                        style={{
                          justifySelf: "start",
                          padding: "10px 15px",
                          border: "none",
                          borderRadius: "8px",
                          background: "#1459D9",
                          color: "#ffffff",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Create New Revision
                      </button>
                    </form>
                  </details>
                )}

                {document.status === "Current" && (
                  <form
                    action={
                      supersedeControlledDocument
                    }
                    style={{
                      marginTop: "12px",
                    }}
                  >
                    <input
                      type="hidden"
                      name="document_id"
                      value={document.id}
                    />

                    <button
                      type="submit"
                      style={{
                        padding: "9px 13px",
                        borderRadius: "8px",
                        border:
                          "1px solid #d8e0ea",
                        background: "#fff8e8",
                        color: "#8a6116",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Mark as Superseded
                    </button>
                  </form>
                )}

                {document.status !== "Withdrawn" && (
                  <form
                    action={
                      withdrawControlledDocument
                    }
                    style={{
                      marginTop: "10px",
                    }}
                  >
                    <input
                      type="hidden"
                      name="document_id"
                      value={document.id}
                    />

                    <button
                      type="submit"
                      style={{
                        padding: "9px 13px",
                        borderRadius: "8px",
                        border:
                          "1px solid #f0b6b0",
                        background: "#fff8f7",
                        color: "#b42318",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Withdraw Document
                    </button>
                  </form>
                )}
              </section>
            )
          )}
        </div>
      </div>
    </main>
  );
}
