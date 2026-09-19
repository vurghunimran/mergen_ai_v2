import ContactClient from "./ContactClient";

export default async function ContactPage({
  searchParams
}: {
  searchParams?: Promise<{ purpose?: string }>;
}) {
  let initialPurpose = "General Inquiry";

  if ((await searchParams)?.purpose === "business") {
    initialPurpose = "Business Partnership";
  }

  if ((await searchParams)?.purpose === "university") {
    initialPurpose = "University Cooperation";
  }

  return <ContactClient initialPurpose={initialPurpose} />;
}
