import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import ApplicationField from "../components/forms/ApplicationField.jsx";
import ApplicationReview from "../components/forms/ApplicationReview.jsx";
import ApplicationStepIndicator from "../components/forms/ApplicationStepIndicator.jsx";
import Alert from "../components/ui/Alert.jsx";
import Button from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { ErrorState, LoadingState } from "../components/ui/Feedback.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { authApi } from "../services/authApi.js";

const steps = [
  {
    title: "Personal Information",
    shortTitle: "Personal",
    fields: [
      "fullName",
      "dateOfBirth",
      "gender",
      "mobileNumber",
      "email",
      "address",
    ],
  },
  {
    title: "Academic Information",
    shortTitle: "Academic",
    fields: [
      "college",
      "course",
      "branch",
      "year",
      "rollNumber",
      "studentId",
      "admissionYear",
    ],
  },
  {
    title: "Family / Guardian",
    shortTitle: "Guardian",
    fields: [
      "guardianName",
      "guardianRelationship",
      "guardianMobile",
      "guardianAddress",
      "guardianOtherInfo",
    ],
  },
  {
    title: "Hostel Information",
    shortTitle: "Hostel",
    fields: ["hostelPreference", "hostelOtherInfo"],
  },
  { title: "Documents", shortTitle: "Documents", fields: [] },
  { title: "Review", shortTitle: "Review", fields: [] },
  { title: "Submit", shortTitle: "Submit", fields: [] },
];

const mobileRules = {
  pattern: {
    value: /^[+()\-\s\d]{7,20}$/,
    message:
      "Enter a valid mobile number using digits and common phone characters.",
  },
};

function FieldGrid({ children }) {
  return <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">{children}</div>;
}

function RequiredNote() {
  return (
    <p className="text-sm text-gov-muted">
      Fields marked with <span className="font-semibold text-rose-700">*</span>{" "}
      are required.
    </p>
  );
}

export default function DemoApplicationWizard() {
  const navigate = useNavigate();
  const methods = useForm({
    mode: "onTouched",
    shouldUnregister: false,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [submissionState, setSubmissionState] = useState("idle");
  const [submissionError, setSubmissionError] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const submittingRef = useRef(false);
  const createdApplicationRef = useRef(null);
  const headingRef = useRef(null);
  const hasNavigatedRef = useRef(false);
  const { getValues, trigger, watch } = methods;
  const values = watch();

  useEffect(() => {
    if (hasNavigatedRef.current) headingRef.current?.focus();
  }, [currentStep]);

  async function goNext() {
    const fields = steps[currentStep].fields;
    const valid =
      fields.length === 0 || (await trigger(fields, { shouldFocus: true }));
    if (!valid) return;
    hasNavigatedRef.current = true;
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function handleStepSubmit(event) {
    event.preventDefault();
    if (currentStep === steps.length - 1) {
      void submitApplication();
    } else {
      void goNext();
    }
  }

  function goPrevious() {
    hasNavigatedRef.current = true;
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  async function submitApplication() {
    if (submittingRef.current || submissionState === "success") return;
    submittingRef.current = true;
    setSubmissionState("loading");
    setSubmissionError("");

    try {
      if (
        selectedDocuments.some(
          (document) =>
            document.status === "invalid" || document.status === "too large",
        )
      ) {
        throw new Error("Remove invalid or oversized files before continuing.");
      }

      const fields = steps.slice(0, 5).flatMap((step) => step.fields);
      const valid = await trigger(fields, { shouldFocus: true });
      if (!valid) {
        const firstInvalidStep = steps
          .slice(0, 5)
          .findIndex((step) =>
            step.fields.some((field) => methods.getFieldState(field).invalid),
          );
        if (firstInvalidStep >= 0) {
          hasNavigatedRef.current = true;
          setCurrentStep(firstInvalidStep);
        }
        setSubmissionState("idle");
        return;
      }

      const { documents, demoAcknowledgement, ...applicationPayload } =
        getValues();
      const application =
        createdApplicationRef.current ??
        (await authApi.submitApplication(applicationPayload));
      createdApplicationRef.current = application;

      let uploadFailed = false;
      for (const selectedDocument of selectedDocuments) {
        if (selectedDocument.status === "success") continue;
        setSelectedDocuments((current) =>
          current.map((document) =>
            document.id === selectedDocument.id
              ? { ...document, status: "uploading", error: "" }
              : document,
          ),
        );
        try {
          await authApi.uploadDocument(
            application.id,
            selectedDocument.file,
            "supporting_document",
          );
          setSelectedDocuments((current) =>
            current.map((document) =>
              document.id === selectedDocument.id
                ? { ...document, status: "success", error: "" }
                : document,
            ),
          );
        } catch (error) {
          uploadFailed = true;
          const status =
            error.code === "UNSUPPORTED_DOCUMENT"
              ? "invalid"
              : error.code === "DOCUMENT_TOO_LARGE"
                ? "too large"
                : "failed";
          setSelectedDocuments((current) =>
            current.map((document) =>
              document.id === selectedDocument.id
                ? { ...document, status, error: error.message }
                : document,
            ),
          );
        }
      }
      if (uploadFailed) {
        throw new Error(
          "Some documents were not uploaded. Review each file and retry.",
        );
      }
      setSubmissionState("success");
      navigate(`/student/applications/${application.id}/acknowledgement`, {
        replace: true,
        state: { application },
      });
    } catch (error) {
      setSubmissionError(error.message);
      setSubmissionState("error");
    } finally {
      submittingRef.current = false;
    }
  }

  function renderCurrentStep() {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-5">
            <FieldGrid>
              <ApplicationField
                label="Full name"
                name="fullName"
                placeholder="Enter full name"
                required
              />
              <ApplicationField
                label="Date of birth"
                name="dateOfBirth"
                required
                type="date"
                rules={{
                  validate: (value) =>
                    value <= new Date().toISOString().slice(0, 10) ||
                    "Date of birth cannot be in the future.",
                }}
              />
              <ApplicationField
                hint="Free-text field; no official option list was supplied."
                label="Gender"
                name="gender"
                placeholder="Enter as stated in official records"
                required
              />
              <ApplicationField
                hint="Use digits and common phone characters."
                label="Mobile number"
                name="mobileNumber"
                placeholder="Enter mobile number"
                required
                rules={mobileRules}
                type="tel"
              />
              <ApplicationField
                className="sm:col-span-2"
                label="Email"
                name="email"
                placeholder="name@example.com"
                required
                rules={{
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address.",
                  },
                }}
                type="email"
              />
              <ApplicationField
                className="sm:col-span-2"
                kind="textarea"
                label="Address"
                name="address"
                placeholder="Enter address"
                required
              />
            </FieldGrid>
            <p className="border-l-4 border-gov-gold bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
              No government ID field is included because an ID requirement was
              not provided in the specification.
            </p>
          </div>
        );
      case 1:
        return (
          <FieldGrid>
            <ApplicationField
              label="College"
              name="college"
              placeholder="Enter college name"
              required
            />
            <ApplicationField
              label="Course"
              name="course"
              placeholder="Enter course"
              required
            />
            <ApplicationField
              label="Branch"
              name="branch"
              placeholder="Enter branch"
              required
            />
            <ApplicationField
              label="Year"
              name="year"
              placeholder="Enter current year"
              required
            />
            <ApplicationField
              label="Roll number"
              name="rollNumber"
              placeholder="Enter roll number"
              required
            />
            <ApplicationField
              label="Student ID"
              name="studentId"
              placeholder="Enter student ID"
              required
            />
            <ApplicationField
              label="Admission year"
              name="admissionYear"
              placeholder="YYYY"
              required
              rules={{
                pattern: {
                  value: /^\d{4}$/,
                  message: "Enter a four-digit year.",
                },
              }}
            />
          </FieldGrid>
        );
      case 2:
        return (
          <FieldGrid>
            <ApplicationField
              label="Parent / guardian name"
              name="guardianName"
              placeholder="Enter full name"
              required
            />
            <ApplicationField
              hint="Free-text field; no official option list was supplied."
              label="Relationship to student"
              name="guardianRelationship"
              placeholder="Enter relationship"
              required
            />
            <ApplicationField
              label="Guardian mobile"
              name="guardianMobile"
              placeholder="Enter mobile number"
              required
              rules={mobileRules}
              type="tel"
            />
            <ApplicationField
              className="sm:col-span-2"
              kind="textarea"
              label="Guardian address"
              name="guardianAddress"
              placeholder="Enter address"
              required
            />
            <ApplicationField
              className="sm:col-span-2"
              hint="Optional; complete only if requested by an official notice."
              kind="textarea"
              label="Additional guardian information"
              name="guardianOtherInfo"
              placeholder="Optional information"
            />
          </FieldGrid>
        );
      case 3:
        return (
          <FieldGrid>
            <ApplicationField
              hint="Fictional options for this UI demo only. They do not represent real hostels or availability."
              kind="select"
              label="Hostel preference"
              name="hostelPreference"
              options={[
                { value: "demo-hostel-a", label: "Demo hostel A" },
                { value: "demo-hostel-b", label: "Demo hostel B" },
              ]}
              required
            />
            <ApplicationField
              className="sm:col-span-2"
              hint="Optional; no hostel requirements were specified."
              kind="textarea"
              label="Other hostel-related information"
              name="hostelOtherInfo"
              placeholder="Optional information"
            />
          </FieldGrid>
        );
      case 4:
        return (
          <div className="max-w-2xl space-y-5">
            <Alert title="Supporting documents are optional" tone="info">
              Upload PDF, JPEG, or PNG files up to 10 MB each. The server checks
              the file contents; the filename and browser-reported type are not
              used to determine safety.
            </Alert>
            <label
              className="block text-sm font-semibold text-gov-ink"
              htmlFor="application-documents"
            >
              Supporting documents
            </label>
            <input
              accept=".pdf,.jpg,.jpeg,.png"
              className="min-h-11 w-full rounded-sm border border-slate-400 bg-white px-3 py-2 text-base text-gov-ink"
              id="application-documents"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                setSelectedDocuments((current) => [
                  ...current,
                  ...files.map((file) => ({
                    id: crypto.randomUUID(),
                    file,
                    status: file.size > 10 * 1024 * 1024 ? "too large" : "idle",
                    error:
                      file.size > 10 * 1024 * 1024
                        ? "The file exceeds the 10 MB limit."
                        : "",
                  })),
                ]);
                event.target.value = "";
              }}
              type="file"
            />
            {selectedDocuments.length > 0 && (
              <ul
                aria-live="polite"
                className="divide-y divide-gov-border border-y border-gov-border"
              >
                {selectedDocuments.map((document) => (
                  <li
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    key={document.id}
                  >
                    <div className="min-w-0">
                      <p className="break-all text-sm font-medium text-gov-ink">
                        {document.file.name}
                      </p>
                      <p className="text-sm text-gov-muted">
                        {document.status === "idle" && "Ready to upload"}
                        {document.status === "uploading" && "Uploading…"}
                        {document.status === "success" && "Uploaded"}
                        {document.status === "failed" && "Upload failed"}
                        {document.status === "invalid" && "Invalid file"}
                        {document.status === "too large" && "Too large"}
                        {document.error && `: ${document.error}`}
                      </p>
                    </div>
                    <button
                      className="min-h-10 shrink-0 self-start font-semibold text-gov-green underline underline-offset-4 sm:self-auto"
                      onClick={() =>
                        setSelectedDocuments((current) =>
                          current.filter((item) => item.id !== document.id),
                        )
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-5">
            <Alert title="Review before continuing" tone="info">
              Confirm your entries below. Use Previous to change information.
              Your application is sent only after the final submit action.
            </Alert>
            <ApplicationReview values={values} documents={selectedDocuments} />
          </div>
        );
      case 6:
        return (
          <div className="max-w-2xl space-y-5">
            <Alert title="Ready to submit" tone="warning">
              Your application details and selected documents will be sent
              securely to the admission service.
            </Alert>
            {submissionState === "loading" && (
              <LoadingState label="Submitting application and documents…" />
            )}
            {submissionState === "error" && (
              <ErrorState
                description={submissionError}
                title={
                  createdApplicationRef.current
                    ? "Submission needs attention"
                    : "Application was not submitted"
                }
              />
            )}
            {selectedDocuments.length > 0 && (
              <ul
                aria-live="polite"
                className="divide-y divide-gov-border border-y border-gov-border"
              >
                {selectedDocuments.map((document) => (
                  <li className="py-3 text-sm" key={document.id}>
                    <span className="font-medium">{document.file.name}</span>
                    <span className="ml-2 text-gov-muted">
                      {document.status}
                    </span>
                    {document.error && (
                      <p className="mt-1 text-rose-800">{document.error}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm leading-6 text-gov-muted">
              You can return to the document step to remove invalid files.
              Failed uploads can be retried without creating another
              application.
            </p>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Apply online" }]}
        description="Complete each section, review your details, then submit your application."
        eyebrow="Student services"
        title="Hostel application"
      />
      <Alert title="Application submission" tone="warning">
        Your authenticated account will be associated with this application.
        Document selections remain local and are not uploaded. Admission
        criteria and any ID/document requirements must be confirmed in an
        official notice.
      </Alert>
      <Card className="max-w-5xl p-4 sm:p-7">
        <ApplicationStepIndicator currentStep={currentStep} steps={steps} />
        <FormProvider {...methods}>
          <form noValidate onSubmit={handleStepSubmit}>
            <section
              aria-labelledby="application-step-heading"
              className="mt-7 border-t border-gov-border pt-6"
            >
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-gov-green">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                  <h2
                    className="mt-1 font-display text-2xl font-semibold text-gov-ink"
                    id="application-step-heading"
                    ref={headingRef}
                    tabIndex={-1}
                  >
                    {steps[currentStep].title}
                  </h2>
                </div>
                {currentStep < 5 && <RequiredNote />}
              </div>
              {renderCurrentStep()}
              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gov-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  disabled={currentStep === 0 || submissionState === "loading"}
                  onClick={goPrevious}
                  type="button"
                  variant="secondary"
                >
                  Previous
                </Button>
                {currentStep < steps.length - 1 ? (
                  <Button type="submit">
                    {currentStep === 5 ? "Continue to submission" : "Next"}
                  </Button>
                ) : (
                  <Button
                    disabled={
                      submissionState === "loading" ||
                      submissionState === "success"
                    }
                    onClick={submitApplication}
                    type="button"
                  >
                    {submissionState === "loading"
                      ? "Please wait…"
                      : submissionState === "error"
                        ? "Retry submission"
                        : "Submit application"}
                  </Button>
                )}
              </div>
            </section>
          </form>
        </FormProvider>
      </Card>
    </div>
  );
}
