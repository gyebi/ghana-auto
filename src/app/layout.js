
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getGeneralWhatsAppUrl } from "@/lib/whatsapp";
import "./globals.css";

export const metadata = {
  title: "Ghana Auto | Find Your Next Car",
  description:
    "Browse quality cars in Ghana and contact our dealership.",
};

export default function RootLayout({ children }) {
  const whatsAppHref = getGeneralWhatsAppUrl();

  return (
    <html lang="en">
      <body>
        <div className="site-wrapper">
          <Header whatsAppHref={whatsAppHref} />
          <main id="main-content">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
