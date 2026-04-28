import { UserRole } from '../../users/user-role.enum';

export type ShipmentRequester = {
  userId: string;
  role: UserRole;
};
