import { registerPlugin } from "@capacitor/core";

export interface TcallPermissionsPlugin {
  checkMicrophone(): Promise<{ granted: boolean }>;
  requestMicrophone(): Promise<{ granted: boolean }>;
  checkCamera(): Promise<{ granted: boolean }>;
  requestCamera(): Promise<{ granted: boolean }>;
  checkNotifications(): Promise<{ granted: boolean }>;
  requestNotifications(): Promise<{ granted: boolean }>;
}

export const TcallPermissions = registerPlugin<TcallPermissionsPlugin>("TcallPermissions");
