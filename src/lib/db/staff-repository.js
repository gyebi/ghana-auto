import "server-only";

import { getPrismaClient } from "./prisma";

const staffUserSelect = {
  id: true,
  firebaseUid: true,
  email: true,
  displayName: true,
  role: true,
  active: true,
};

export async function findActiveStaffUserByFirebaseUid(firebaseUid) {
  if (typeof firebaseUid !== "string" || firebaseUid.length === 0) {
    return null;
  }

  const prisma = getPrismaClient();

  return prisma.staffUser.findFirst({
    where: {
      firebaseUid,
      active: true,
    },
    select: staffUserSelect,
  });
}
