export const publicPages = [
  {
    path: "/about-hostel",
    title: "About hostel services",
    eyebrow: "Public information",
    description:
      "An introduction to the government hostel admission information service.",
    sections: [
      {
        title: "Purpose of this portal",
        body: "This portal is a public-facing information interface for hostel admission. It is a frontend demonstration and is not an official application channel.",
      },
      {
        title: "About the hostel authority",
        body: "The responsible department, hostel locations, and service scope have not been supplied for this demo. Refer to an official government notice for verified details.",
      },
    ],
  },
  {
    path: "/hostel-details",
    title: "Hostel details",
    eyebrow: "Accommodation directory",
    description:
      "Hostel locations, availability, and contacts must be confirmed by the responsible authority.",
    sections: [
      {
        title: "Directory status",
        body: "DEMO DATA: no verified hostel names, addresses, capacity, room types, or contact details were provided. This portal does not represent availability.",
        points: [
          "Hostel names: not provided",
          "Locations: not provided",
          "Availability: not provided",
        ],
      },
      {
        title: "Before making arrangements",
        body: "Do not rely on this demo for accommodation decisions. Check the current official admission notice or contact the published government office.",
      },
    ],
  },
  {
    path: "/facilities",
    title: "Facilities",
    eyebrow: "Hostel information",
    description:
      "Facility information will be shown here once verified details are supplied.",
    sections: [
      {
        title: "Facility information",
        body: "DEMO DATA: no hostel facility inventory has been provided. The portal makes no claim about rooms, meals, accessibility, study areas, internet, or security arrangements.",
      },
      {
        title: "Verified updates",
        body: "Use the public notices page for official updates when the responsible authority publishes them.",
      },
    ],
  },
  {
    path: "/eligibility",
    title: "Eligibility",
    eyebrow: "Admission guidance",
    description:
      "Eligibility rules are determined by the responsible authority and must be verified in its current notice.",
    sections: [
      {
        title: "Criteria not supplied",
        body: "DEMO DATA: no official eligibility criteria were included with this project. No age, residence, income, course, or category conditions are asserted here.",
      },
      {
        title: "What to check in an official notice",
        body: "When published, read the full notice for the applicable student groups, required evidence, deadlines, and any exceptions. Contact the issuing office if a condition is unclear.",
      },
    ],
  },
  {
    path: "/rules-regulations",
    title: "Rules and regulations",
    eyebrow: "Student guidance",
    description:
      "Hostel rules must be taken from the current rules issued by the competent authority.",
    sections: [
      {
        title: "Official rules not provided",
        body: "DEMO DATA: no approved rules or regulations were supplied. This page does not establish curfew, visitor, leave, conduct, or disciplinary policies.",
      },
      {
        title: "Where to find confirmed rules",
        body: "Review the official hostel handbook or admission notice and request clarification from the responsible office before accepting a place.",
      },
    ],
  },
  {
    path: "/fee-structure",
    title: "Fee structure",
    eyebrow: "Payments and charges",
    description:
      "No fees or payment instructions have been supplied for this demonstration.",
    table: {
      caption: "Demonstration fee structure; no official amounts supplied",
      columns: [
        { key: "charge", heading: "Charge" },
        { key: "amount", heading: "Amount" },
        { key: "note", heading: "Note" },
      ],
      rows: [
        {
          charge: "Hostel fee",
          amount: "DEMO DATA — not provided",
          note: "Confirm with an official notice",
        },
        {
          charge: "Other charges",
          amount: "DEMO DATA — not provided",
          note: "No payment is requested by this demo",
        },
      ],
    },
    sections: [
      {
        title: "Payment safety",
        body: "Do not transfer money based on this page. Verify the amount, due date, and authorized payment method directly through an official government source.",
      },
    ],
  },
  {
    path: "/required-documents",
    title: "Required documents",
    eyebrow: "Application preparation",
    description: "The official document checklist has not been provided.",
    sections: [
      {
        title: "Checklist status",
        body: "DEMO DATA: no documents are confirmed as required. Do not submit identity, financial, education, or other personal records through this demonstration site.",
      },
      {
        title: "When the checklist is published",
        body: "Use only the current official checklist. Confirm accepted formats, certification requirements, and whether originals must be presented in person.",
      },
    ],
  },
  {
    path: "/important-dates",
    title: "Important dates",
    eyebrow: "Admission calendar",
    description:
      "Dates below are explicitly unannounced placeholders, not an admission schedule.",
    table: {
      caption: "Demonstration admission calendar with no dates supplied",
      columns: [
        { key: "event", heading: "Event" },
        { key: "date", heading: "Date" },
        { key: "status", heading: "Status" },
      ],
      rows: [
        {
          event: "Application opening",
          date: "DEMO DATA — not announced",
          status: "Awaiting official notice",
        },
        {
          event: "Application closing",
          date: "DEMO DATA — not announced",
          status: "Awaiting official notice",
        },
        {
          event: "Selection updates",
          date: "DEMO DATA — not announced",
          status: "Awaiting official notice",
        },
      ],
    },
    sections: [
      {
        title: "Check for updates",
        body: "Only dates published by the responsible government authority should be treated as official.",
      },
    ],
  },
  {
    path: "/notices",
    title: "Public notices",
    eyebrow: "Official updates",
    description: "This demonstration contains no issued government notices.",
    sections: [
      {
        title: "No notices supplied",
        body: "DEMO DATA: there are no official circulars, admission announcements, or downloadable notices attached to this site.",
      },
      {
        title: "Verify a notice",
        body: "For a real admission cycle, verify the issuing department, publication date, reference number, and any later corrections using an official government channel.",
      },
    ],
  },
  {
    path: "/faqs",
    title: "Frequently asked questions",
    eyebrow: "Help and guidance",
    description:
      "Answers in this demo direct students to verified government information rather than assume policy.",
    faqs: [
      {
        question: "When do applications open?",
        answer:
          "No application dates were supplied. Check the official notice for the current admission cycle.",
      },
      {
        question: "Who is eligible for a hostel place?",
        answer:
          "Eligibility criteria have not been provided here. Use the criteria in the current notice issued by the responsible authority.",
      },
      {
        question: "What documents should I prepare?",
        answer:
          "The official document checklist is not available in this demo. Do not send personal records through this site.",
      },
      {
        question: "Can I submit an application here?",
        answer:
          "No. This frontend demonstration does not accept or store applications.",
      },
    ],
  },
  {
    path: "/contact",
    title: "Contact",
    eyebrow: "Student assistance",
    description:
      "Verified office contact information has not been supplied for this demonstration.",
    sections: [
      {
        title: "Admission office",
        body: "DEMO DATA: department name, office address, telephone number, and email address are not provided. No contact details are invented on this page.",
      },
      {
        title: "Getting help",
        body: "Refer to an official government portal or published admission notice to find the responsible office and its current service hours.",
      },
    ],
  },
];
