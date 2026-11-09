# Vehicle image upload operations

The direct-upload signature only permits one generated image public ID in the
current configured Cloudinary project and environment. The public ID itself
contains the `ghana-auto/dev/vehicles` or `ghana-auto/prod/vehicles` prefix.
For this account's dynamic-folder mode, the signed `asset_folder` has that same
value so the asset appears in the matching Media Library folder without
altering the public ID. The legacy `folder` parameter is not sent, preventing a
second prefix. It does not create a `VehicleImage` record. The shorter signed
upload grant must still be valid when the future server-side attachment
operation retrieves the asset through the Cloudinary Admin API and verifies its
public ID, asset folder, resource type, format, bytes, and signed context.

The Cloudinary signed upload API constrains the resource to approved image
formats, but this project does not rely on a client-provided size claim or an
unverified Cloudinary response for its 10 MB policy. The browser rejects larger
files before upload and the server checks the Admin API's reported bytes before
any Neon record is written. A Cloudinary upload preset that enforces a file
size could be added later only after separately reviewing its production
configuration and interaction with this signed-upload flow.

Rejected or abandoned uploads must be cleaned up by a trusted server job, never
by a browser request. That job must use the current server Cloudinary
configuration, enumerate only the exact current environment folder, and delete
only assets that all meet these conditions:

- Their public ID and signed context match the current project/environment.
- No `VehicleImage.cloudinaryPublicId` record references the public ID.
- They are older than the attachment-grant lifetime plus the configured
  operational grace period.

The cleanup operation must pass the exact server-discovered public ID to
Cloudinary. It must not accept a client public ID, delete by an unqualified
prefix, or operate against a different Cloudinary cloud or environment. No
cleanup job is implemented in this checkpoint, so it cannot affect existing
Cloudinary assets.
