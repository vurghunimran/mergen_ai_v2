import ContactClient from "./ContactClient";

export default function ContactPage({
  searchParams
}: {
  searchParams?: { purpose?: string };
}) {
  let initialPurpose = "General Inquiry";

  if (searchParams?.purpose === "business") {
    initialPurpose = "Business Partnership";
  }

  if (searchParams?.purpose === "university") {
    initialPurpose = "University Cooperation";
  }

  return <ContactClient initialPurpose={initialPurpose} />;
}
