import {
  collection,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type {
  Activity,
  Contract,
  FieldDoc,
  LeaveRequest,
  UserDoc,
} from "@/types/domain";

function converter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data) => data,
    fromFirestore: (snap: QueryDocumentSnapshot) =>
      ({ id: snap.id, ...snap.data() }) as T,
  };
}

export const contractsCol = collection(db, "contracts").withConverter(converter<Contract>());
export const fieldsCol = collection(db, "fields").withConverter(converter<FieldDoc>());
export const usersCol = collection(db, "users").withConverter(converter<UserDoc>());
export const leaveRequestsCol = collection(db, "leaveRequests").withConverter(
  converter<LeaveRequest>()
);
export const activitiesCol = collection(db, "activities").withConverter(converter<Activity>());
