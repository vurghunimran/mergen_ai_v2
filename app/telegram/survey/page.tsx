import Script from "next/script";
import TelegramSurveyClient from "./TelegramSurveyClient";

export default function TelegramSurveyPage() {
  return <><Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" /><TelegramSurveyClient /></>;
}
