import Alert from "../ui/Alert.jsx";

export default function DemoNotice() {
  return (
    <div className="border-b border-amber-300 bg-amber-50">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <Alert
          className="border-0 bg-transparent px-0 py-0 text-amber-950"
          title="DEMO DATA — NOT OFFICIAL"
          tone="warning"
        >
          Admission dates, fees, facilities, eligibility, notices, and contact
          details are placeholders. Confirm all information with the responsible
          government office.
        </Alert>
      </div>
    </div>
  );
}
