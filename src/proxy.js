import { NextResponse } from "next/server";

import { publicVehicleExistsBySlug } from "./lib/db/vehicle-repository";

const vehicleNotFoundDocument = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Vehicle Not Found | Ghana Auto</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; }
      .container { min-height: 65vh; display: flex; align-items: center; justify-content: center; padding: 70px 24px; background: #f5f7fa; }
      .content { width: 100%; max-width: 600px; text-align: center; }
      .errorCode { margin: 0 0 16px; color: #f59e0b; font-size: clamp(5rem, 13vw, 9rem); font-weight: 800; line-height: 1; }
      .title { margin: 0 0 18px; color: #101b2b; font-size: clamp(1.8rem, 4vw, 2.7rem); }
      .description { max-width: 460px; margin: 0 auto 30px; color: #64748b; line-height: 1.8; }
      .button { display: inline-flex; align-items: center; justify-content: center; min-height: 50px; padding: 13px 24px; border-radius: 6px; background: #f59e0b; color: #101b2b; font-weight: 800; text-decoration: none; }
    </style>
  </head>
  <body>
    <section class="container">
      <div class="content">
        <p class="errorCode">404</p>
        <h1 class="title">Vehicle Not Found</h1>
        <p class="description">The vehicle you are looking for may have been removed, sold, or is no longer available. Explore our current inventory to find another great option.</p>
        <a class="button" href="/cars">← Browse Available Vehicles</a>
      </div>
    </section>
  </body>
</html>`;

// Resolve public visibility before the PPR response begins. Returning this
// existing not-found design directly is necessary to preserve an HTTP 404;
// a notFound() thrown after a PPR fallback has streamed would be a 200.
export async function proxy(request) {
  const slug = request.nextUrl.pathname.split("/")[2];
  const exists = await publicVehicleExistsBySlug(slug);

  if (exists) return NextResponse.next();

  return new NextResponse(vehicleNotFoundDocument, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

export const config = {
  matcher: "/cars/:slug",
};
