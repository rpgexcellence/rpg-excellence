"use client";

import { useMemo, useState } from "react";
import {
  RCA_FAILURE_MECHANISMS,
  RCA_PROFILE_CATALOG,
  RCA_PROFILE_STANDARDS,
} from "../../../../lib/rca-profile-catalog";

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #c8d6e8",
  borderRadius: "11px",
  background: "#fff",
  color: "#061a35",
  padding: "12px 13px",
  font: "inherit",
};

export default function RcaLegacyProfileFields({
  defaults = {},
  compact = false,
}) {
  const initialCategory = defaults.profile_category || "";
  const [categoryCode, setCategoryCode] = useState(initialCategory);
  const [profileCode, setProfileCode] = useState(
    defaults.profile_code || ""
  );

  const category = useMemo(
    () =>
      RCA_PROFILE_CATALOG.find(
        (item) => item.code === categoryCode
      ) || null,
    [categoryCode]
  );

  const selectedProfile = category?.profiles.find(
    ([code]) => code === profileCode
  );

  function chooseCategory(code) {
    setCategoryCode(code);

    if (
      !RCA_PROFILE_CATALOG.find(
        (item) => item.code === code
      )?.profiles.some(([profile]) => profile === profileCode)
    ) {
      setProfileCode("");
    }
  }

  return (
    <section style={{ marginTop: compact ? 12 : 16 }}>
      <input
        type="hidden"
        name="profile_category"
        value={categoryCode}
      />

      <div
        style={{
          color: "#155eef",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: ".06em",
          textTransform: "uppercase",
        }}
      >
        Step 1 · Choose code / category
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(145px, 1fr))",
          gap: 8,
          marginTop: 9,
        }}
      >
        {RCA_PROFILE_CATALOG.map((item) => {
          const active = item.code === categoryCode;

          return (
            <button
              key={item.code}
              type="button"
              onClick={() => chooseCategory(item.code)}
              aria-pressed={active}
              style={{
                minHeight: 66,
                cursor: "pointer",
                textAlign: "left",
                border: `1px solid ${
                  active ? "#2f5bea" : "#ced9e7"
                }`,
                borderRadius: 11,
                padding: "10px 11px",
                background: active ? "#2f5bea" : "#fff",
                color: active ? "#fff" : "#061a35",
                font: "inherit",
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: 17,
                }}
              >
                {item.code}
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: 3,
                  fontSize: 11,
                  lineHeight: 1.3,
                }}
              >
                {item.title}
              </span>
            </button>
          );
        })}
      </div>

      {category && (
        <div
          style={{
            marginTop: 15,
            padding: compact ? 14 : 17,
            border: "1px solid #9fbbff",
            borderRadius: 13,
            background: "#f5f8ff",
          }}
        >
          <div
            style={{
              color: "#155eef",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            Step 2 · Choose detailed profile
          </div>

          <label
            style={{
              display: "block",
              marginTop: 9,
              fontWeight: 800,
            }}
          >
            {category.code} — {category.title}

            <select
              name="profile_code"
              required
              value={profileCode}
              onChange={(event) =>
                setProfileCode(event.target.value)
              }
              style={{
                ...inputStyle,
                marginTop: 7,
              }}
            >
              <option value="">
                Select the evidence-supported profile
              </option>

              {category.profiles.map(([code, title]) => (
                <option key={code} value={code}>
                  {code} — {title}
                </option>
              ))}
            </select>
          </label>

          {selectedProfile && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  color: "#155eef",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                }}
              >
                Step 3 · Complete the profile
              </div>

              <div
                style={{
                  marginTop: 8,
                  padding: "11px 13px",
                  borderRadius: 10,
                  background: "#eaf1ff",
                  fontWeight: 800,
                }}
              >
                Selected profile: {selectedProfile[0]} —{" "}
                {selectedProfile[1]}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 10,
                  marginTop: 11,
                }}
              >
                <select
                  name="failure_mechanism"
                  required
                  defaultValue={
                    defaults.failure_mechanism || ""
                  }
                  style={inputStyle}
                >
                  <option value="">Failure mechanism</option>

                  {RCA_FAILURE_MECHANISMS.map(
                    ([value, title]) => (
                      <option key={value} value={value}>
                        {title}
                      </option>
                    )
                  )}
                </select>

                <input
                  name="affected_process"
                  required
                  defaultValue={
                    defaults.affected_process || ""
                  }
                  placeholder="Affected process / activity"
                  style={inputStyle}
                />

                <select
                  name="profile_extent"
                  required
                  defaultValue={
                    defaults.profile_extent || ""
                  }
                  style={inputStyle}
                >
                  <option value="">Extent of condition</option>
                  <option value="isolated">Isolated</option>
                  <option value="process_wide">
                    Process-wide
                  </option>
                  <option value="site_wide">Site-wide</option>
                  <option value="organisation_wide">
                    Organisation-wide
                  </option>
                  <option value="external_interface">
                    External interface
                  </option>
                </select>

                <select
                  name="control_layer"
                  required
                  defaultValue={
                    defaults.control_layer || ""
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Control layer affected
                  </option>
                  <option value="prevention">Prevention</option>
                  <option value="detection">Detection</option>
                  <option value="response">Response</option>
                  <option value="recovery">Recovery</option>
                </select>

                <select
                  name="recurrence_relationship"
                  required
                  defaultValue={
                    defaults.recurrence_relationship || ""
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Recurrence relationship
                  </option>
                  <option value="first_occurrence">
                    First occurrence
                  </option>
                  <option value="similar_previous">
                    Similar previous issue
                  </option>
                  <option value="confirmed_recurrence">
                    Confirmed recurrence
                  </option>
                  <option value="unknown">Unknown</option>
                </select>

                <input
                  name="accountable_system_owner"
                  required
                  defaultValue={
                    defaults.accountable_system_owner || ""
                  }
                  placeholder="Accountable system owner"
                  style={inputStyle}
                />
              </div>

              <fieldset
                style={{
                  margin: "12px 0 0",
                  padding: "12px 13px",
                  border: "1px solid #c8d6e8",
                  borderRadius: 11,
                  background: "#fff",
                }}
              >
                <legend
                  style={{
                    padding: "0 6px",
                    fontWeight: 800,
                  }}
                >
                  Applicable standard(s) · select at least one
                </legend>

                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    flexWrap: "wrap",
                  }}
                >
                  {RCA_PROFILE_STANDARDS.map(
                    ([value, title]) => (
                      <label
                        key={value}
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          name="applicable_standards"
                          value={value}
                          defaultChecked={(
                            defaults.applicable_standards || []
                          ).includes(value)}
                        />
                        {title}
                      </label>
                    )
                  )}
                </div>
              </fieldset>

              <textarea
                name="profile_rationale"
                required
                defaultValue={
                  defaults.profile_rationale || ""
                }
                rows={3}
                placeholder="Why does this code describe the evidence-supported, correctable causal condition rather than only the observed symptom?"
                style={{
                  ...inputStyle,
                  marginTop: 11,
                }}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
