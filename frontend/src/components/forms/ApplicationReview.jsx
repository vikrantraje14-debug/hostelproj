const groups = [
  {
    title: "Personal information",
    fields: [
      ["Full name", "fullName"],
      ["Date of birth", "dateOfBirth"],
      ["Gender", "gender"],
      ["Mobile number", "mobileNumber"],
      ["Email", "email"],
      ["Address", "address"],
    ],
  },
  {
    title: "Academic information",
    fields: [
      ["College", "college"],
      ["Course", "course"],
      ["Branch", "branch"],
      ["Year", "year"],
      ["Roll number", "rollNumber"],
      ["Student ID", "studentId"],
      ["Admission year", "admissionYear"],
    ],
  },
  {
    title: "Family / guardian",
    fields: [
      ["Parent / guardian name", "guardianName"],
      ["Relationship", "guardianRelationship"],
      ["Mobile", "guardianMobile"],
      ["Address", "guardianAddress"],
      ["Additional information", "guardianOtherInfo"],
    ],
  },
  {
    title: "Hostel information",
    fields: [
      ["Hostel preference", "hostelPreference"],
      ["Other hostel-related information", "hostelOtherInfo"],
    ],
  },
];

function displayValue(value) {
  if (typeof FileList !== "undefined" && value instanceof FileList) {
    return (
      Array.from(value)
        .map((file) => file.name)
        .join(", ") || "No files selected"
    );
  }

  return typeof value === "string" && value.trim() ? value : "Not provided";
}

export default function ApplicationReview({ values, documents = [] }) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section
          aria-labelledby={`review-${group.title.replaceAll(" ", "-").toLowerCase()}`}
          className="border-t border-gov-border pt-4"
          key={group.title}
        >
          <h3
            className="font-display text-lg font-semibold text-gov-ink"
            id={`review-${group.title.replaceAll(" ", "-").toLowerCase()}`}
          >
            {group.title}
          </h3>
          <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {group.fields.map(([label, name]) => (
              <div className="min-w-0" key={name}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gov-muted">
                  {label}
                </dt>
                <dd className="mt-1 wrap-break-word whitespace-pre-wrap text-sm text-gov-ink">
                  {displayValue(values[name])}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <section
        aria-labelledby="review-documents"
        className="border-t border-gov-border pt-4"
      >
        <h3
          className="font-display text-lg font-semibold text-gov-ink"
          id="review-documents"
        >
          Supporting documents
        </h3>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-gov-muted">None selected</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-gov-ink">
            {documents.map((document) => (
              <li className="break-all" key={document.id}>
                {document.file.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
