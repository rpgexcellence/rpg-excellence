import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";

export const metadata = {
  title: "Document Register | RPG Intelligence",
};

const STORAGE_BUCKET =
  "controlled-documents";

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(value)
  );
}

export default async function DocumentRegisterPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const requestedFamily =
    typeof resolvedSearchParams?.family === "string"
      ? resolvedSearchParams.family
      : null;
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/portal/login"
    );
  }

  const {
    data: documentsData,
    error: documentsError,
  } = await supabase
    .from(
      "controlled_documents"
    )
    .select(
      `
        id,
        document_number,
        title,
        document_type,
        standard,
        revision,
        status,
        audience,
        issue_date,
        review_date,
        description,
        file_name,
        file_path,
        approved_by,
        approved_at
      `
    )
    .eq(
      "status",
      "Current"
    )
    .in(
      "audience",
      [
        "Customer",
        "Both",
      ]
    )
    .order(
      "standard",
      {
        ascending: true,
        nullsFirst: false,
      }
    )
    .order(
      "document_number",
      {
        ascending: true,
      }
    )
    .order(
      "revision",
      {
        ascending: false,
      }
    );

  if (documentsError) {
    throw new Error(
      documentsError.message
    );
  }

  const documents =
    documentsData ?? [];

  const availableFamilies = Array.from(
    new Set(
      documents.map(
        (document) =>
          document.standard || "RPG General"
      )
    )
  );

  const selectedFamily =
    availableFamilies.includes(requestedFamily)
      ? requestedFamily
      : null;

  const visibleDocuments = selectedFamily
    ? documents.filter(
        (document) =>
          (document.standard || "RPG General") ===
          selectedFamily
      )
    : documents;

  const admin =
    createAdminClient();

  const documentsWithAccess =
    await Promise.all(
      visibleDocuments.map(
        async (document) => {
          if (
            !document.file_path
          ) {
            return {
              ...document,
              signed_url: null,
            };
          }

          const {
            data,
            error,
          } =
            await admin.storage
              .from(
                STORAGE_BUCKET
              )
              .createSignedUrl(
                document.file_path,
                60 * 10,
                {
                  download:
                    document.file_name ||
                    true,
                }
              );

          if (error) {
            console.error(
              `Unable to create signed URL for ${document.document_number}:`,
              error.message
            );

            return {
              ...document,
              signed_url: null,
            };
          }

          return {
            ...document,
            signed_url:
              data?.signedUrl ??
              null,
          };
        }
      )
    );

  const standards =
    Array.from(
      new Set(
        documentsWithAccess.map(
          (document) =>
            document.standard ||
            "RPG General"
        )
      )
    );

  const withFiles =
    documentsWithAccess.filter(
      (document) =>
        Boolean(
          document.signed_url
        )
    ).length;

  const documentTypes =
    new Set(
      documentsWithAccess.map(
        (document) =>
          document.document_type
      )
    ).size;

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#f3f6f9",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <header
        style={{
          background:
            "#071A33",
          color:
            "#ffffff",
          padding:
            "20px 30px",
        }}
      >
        <div
          style={{
            maxWidth:
              "1200px",
            margin:
              "0 auto",
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap:
              "20px",
            flexWrap:
              "wrap",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              RPG Intelligence
            </h2>

            <p
              style={{
                marginTop:
                  "6px",
                marginBottom:
                  0,
                opacity:
                  0.75,
              }}
            >
              Controlled Document Register
            </p>
          </div>

          <div
            style={{
              display:
                "flex",
              gap:
                "10px",
              alignItems:
                "center",
              flexWrap:
                "wrap",
            }}
          >
            <Link
              href="/portal"
              style={{
                padding:
                  "10px 14px",
                color:
                  "#ffffff",
                textDecoration:
                  "none",
                fontWeight:
                  700,
              }}
            >
              Dashboard
            </Link>

            <Link
              href="/portal/history"
              style={{
                padding:
                  "10px 14px",
                color:
                  "#ffffff",
                textDecoration:
                  "none",
                fontWeight:
                  700,
              }}
            >
              History
            </Link>

            <Link
              href="/portal/reports"
              style={{
                padding:
                  "10px 14px",
                color:
                  "#ffffff",
                textDecoration:
                  "none",
                fontWeight:
                  700,
              }}
            >
              Reports
            </Link>

            <span
              style={{
                padding:
                  "10px 14px",
                color:
                  "#8eb7ff",
                fontWeight:
                  800,
              }}
            >
              Document Register
            </span>
          </div>
        </div>
      </header>

      <section
        style={{
          maxWidth:
            "1200px",
          margin:
            "0 auto",
          padding:
            "40px",
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap:
              "20px",
            flexWrap:
              "wrap",
            marginBottom:
              "28px",
          }}
        >
          <div>
            <p
              style={{
                color:
                  "#1459D9",
                fontWeight:
                  700,
                marginBottom:
                  "8px",
              }}
            >
              CONTROLLED DOCUMENTS
            </p>

            <h1
              style={{
                color:
                  "#071A33",
                fontSize:
                  "38px",
                marginTop:
                  0,
                marginBottom:
                  "8px",
              }}
            >
              Document Register
            </h1>

            <p
              style={{
                color:
                  "#617087",
                maxWidth:
                  "760px",
                lineHeight:
                  1.6,
                marginTop:
                  0,
              }}
            >
              Access current RPG Excellence
              procedures, forms, reports,
              scripts, guidance and templates
              relevant to your management
              system and assessment services.
            </p>
          </div>

          <Link
            href="/portal"
            style={{
              padding:
                "12px 18px",
              borderRadius:
                "8px",
              background:
                "#071A33",
              color:
                "#ffffff",
              textDecoration:
                "none",
              fontWeight:
                700,
            }}
          >
            ← Dashboard
          </Link>
        </div>

        <div
          style={{
            background:
              "#eef4ff",
            border:
              "1px solid #d6e4ff",
            color:
              "#405574",
            borderRadius:
              "10px",
            padding:
              "16px 18px",
            lineHeight:
              1.55,
            marginBottom:
              "24px",
          }}
        >
          Only current controlled documents
          approved for Customer or Both
          audiences appear here. Download
          links are temporary secure links
          generated for signed-in users and
          expire automatically.
        </div>

        <nav
          aria-label="Document families"
          style={{
            display: "flex",
            gap: "9px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <Link
            href="/portal/documents"
            style={familyFilterStyle(!selectedFamily)}
          >
            All families
          </Link>

          {availableFamilies.map((family) => (
            <Link
              key={family}
              href={`/portal/documents?family=${encodeURIComponent(family)}`}
              style={familyFilterStyle(selectedFamily === family)}
            >
              {family}
            </Link>
          ))}
        </nav>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(190px, 1fr))",
            gap:
              "14px",
            marginBottom:
              "28px",
          }}
        >
          {[
            [
              "CURRENT DOCUMENTS",
              documentsWithAccess.length,
            ],
            [
              "STANDARDS / FAMILIES",
              standards.length,
            ],
            [
              "DOCUMENT TYPES",
              documentTypes,
            ],
            [
              "FILES AVAILABLE",
              withFiles,
            ],
          ].map(
            ([label, value]) => (
              <div
                key={
                  label
                }
                style={{
                  background:
                    "#ffffff",
                  border:
                    "1px solid #dfe6ee",
                  borderRadius:
                    "12px",
                  padding:
                    "18px",
                }}
              >
                <div
                  style={{
                    color:
                      "#617087",
                    fontSize:
                      "11px",
                    fontWeight:
                      800,
                    marginBottom:
                      "7px",
                  }}
                >
                  {label}
                </div>

                <strong
                  style={{
                    color:
                      "#071A33",
                    fontSize:
                      "28px",
                  }}
                >
                  {value}
                </strong>
              </div>
            )
          )}
        </section>

        {documentsWithAccess.length ===
        0 ? (
          <section
            style={{
              background:
                "#ffffff",
              border:
                "1px solid #dfe6ee",
              borderRadius:
                "14px",
              padding:
                "28px",
              color:
                "#617087",
            }}
          >
            No customer documents are
            currently published in the
            register.
          </section>
        ) : (
          <div
            style={{
              display:
                "grid",
              gap:
                "26px",
            }}
          >
            {standards.map(
              (standard) => {
                const standardDocuments =
                  documentsWithAccess.filter(
                    (
                      document
                    ) =>
                      (
                        document.standard ||
                        "RPG General"
                      ) ===
                      standard
                  );

                return (
                  <section
                    key={
                      standard
                    }
                    style={{
                      background:
                        "#ffffff",
                      border:
                        "1px solid #dfe6ee",
                      borderRadius:
                        "14px",
                      overflow:
                        "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding:
                          "22px 24px",
                        borderBottom:
                          "1px solid #e6ebf1",
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap:
                          "12px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color:
                              "#1459D9",
                            fontSize:
                              "11px",
                            fontWeight:
                              800,
                            marginBottom:
                              "5px",
                          }}
                        >
                          DOCUMENT FAMILY
                        </div>

                        <h2
                          style={{
                            color:
                              "#071A33",
                            margin:
                              0,
                          }}
                        >
                          {
                            standard
                          }
                        </h2>
                      </div>

                      <strong
                        style={{
                          color:
                            "#617087",
                          fontSize:
                            "13px",
                        }}
                      >
                        {
                          standardDocuments.length
                        }{" "}
                        current document(s)
                      </strong>
                    </div>

                    <div
                      style={{
                        overflowX:
                          "auto",
                      }}
                    >
                      <table
                        style={{
                          width:
                            "100%",
                          borderCollapse:
                            "collapse",
                          minWidth:
                            "980px",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background:
                                "#f7f9fc",
                            }}
                          >
                            {[
                              "Document No.",
                              "Title",
                              "Type",
                              "Revision",
                              "Issue Date",
                              "Review Date",
                              "Status",
                              "Access",
                            ].map(
                              (
                                heading
                              ) => (
                                <th
                                  key={
                                    heading
                                  }
                                  style={{
                                    textAlign:
                                      "left",
                                    color:
                                      "#617087",
                                    fontSize:
                                      "11px",
                                    padding:
                                      "12px 16px",
                                    borderBottom:
                                      "1px solid #e6ebf1",
                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {
                                    heading
                                  }
                                </th>
                              )
                            )}
                          </tr>
                        </thead>

                        <tbody>
                          {standardDocuments.map(
                            (
                              document
                            ) => (
                              <tr
                                key={
                                  document.id
                                }
                              >
                                <td
                                  style={{
                                    padding:
                                      "15px 16px",
                                    borderBottom:
                                      "1px solid #eef1f5",
                                    color:
                                      "#071A33",
                                    fontWeight:
                                      700,
                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {
                                    document.document_number
                                  }
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "15px 16px",
                                    borderBottom:
                                      "1px solid #eef1f5",
                                    color:
                                      "#071A33",
                                    minWidth:
                                      "260px",
                                  }}
                                >
                                  <strong>
                                    {
                                      document.title
                                    }
                                  </strong>

                                  {document.description && (
                                    <div
                                      style={{
                                        color:
                                          "#617087",
                                        fontSize:
                                          "12px",
                                        lineHeight:
                                          1.5,
                                        marginTop:
                                          "5px",
                                      }}
                                    >
                                      {
                                        document.description
                                      }
                                    </div>
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "15px 16px",
                                    borderBottom:
                                      "1px solid #eef1f5",
                                    color:
                                      "#617087",
                                  }}
                                >
                                  {
                                    document.document_type
                                  }
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "15px 16px",
                                    borderBottom:
                                      "1px solid #eef1f5",
                                    color:
                                      "#071A33",
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  {
                                    document.revision
                                  }
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "15px 16px",
                                    borderBottom:
                                      "1px solid #eef1f5",
                                    color:
                                      "#617087",
                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {formatDate(
                                    document.issue_date
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "15px 16px",
                                    borderBottom:
                                      "1px solid #eef1f5",
                                    color:
                                      "#617087",
                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {formatDate(
                                    document.review_date
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "15px 16px",
                                    borderBottom:
                                      "1px solid #eef1f5",
                                  }}
                                >
                                  <span
                                    style={{
                                      display:
                                        "inline-block",
                                      padding:
                                        "6px 10px",
                                      borderRadius:
                                        "999px",
                                      background:
                                        "#edf8f3",
                                      color:
                                        "#16794b",
                                      fontWeight:
                                        800,
                                      fontSize:
                                        "12px",
                                    }}
                                  >
                                    {
                                      document.status
                                    }
                                  </span>
                                </td>

                                <td
                                  style={{
                                    padding:
                                      "15px 16px",
                                    borderBottom:
                                      "1px solid #eef1f5",
                                  }}
                                >
                                  {document.signed_url ? (
                                    <a
                                      href={
                                        document.signed_url
                                      }
                                      style={{
                                        display:
                                          "inline-block",
                                        padding:
                                          "9px 13px",
                                        borderRadius:
                                          "8px",
                                        background:
                                          "#1459D9",
                                        color:
                                          "#ffffff",
                                        textDecoration:
                                          "none",
                                        fontWeight:
                                          700,
                                        fontSize:
                                          "13px",
                                      }}
                                    >
                                      View / Download
                                    </a>
                                  ) : (
                                    <span
                                      style={{
                                        color:
                                          "#98a2b3",
                                        fontSize:
                                          "13px",
                                      }}
                                    >
                                      File unavailable
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function familyFilterStyle(active) {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "42px",
    padding: "10px 15px",
    borderRadius: "10px",
    border: active
      ? "1px solid #1762ef"
      : "1px solid #d7e2ee",
    background: active
      ? "#1762ef"
      : "#ffffff",
    color: active
      ? "#ffffff"
      : "#12385f",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 800,
  };
}
