import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import {
  relationObjectTypeEnum,
  relationSubjectTypeEnum,
  relationTypeEnum,
} from "../enums";

/**
 * ReBAC relationship graph.
 *
 * Every permission check reads from here.
 * A tuple reads as:
 *   subject (subjectType:subjectId) has [relation] on (objectType:objectId)
 *
 * Examples:
 *   user:alice  owner          workspace:ws-1
 *   user:bob    member         workspace:ws-1
 *   user:carol  project_member project:proj-1
 *   user:dave   reviewer       feature_request:fr-1
 */
export const relation = pgTable(
  "relation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    subjectType: relationSubjectTypeEnum("subjectType").notNull(),
    subjectId: text("subjectId").notNull(),
    relation: relationTypeEnum("relation").notNull(),
    objectType: relationObjectTypeEnum("objectType").notNull(),
    objectId: text("objectId").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    // no duplicate tuples
    uniqueIndex("uq_relation_tuple").on(
      t.subjectType,
      t.subjectId,
      t.relation,
      t.objectType,
      t.objectId
    ),
    // "what can this user do on this object type?"
    index("idx_relation_subject").on(t.subjectType, t.subjectId, t.objectType),
    // "who has access to this object?"
    index("idx_relation_object").on(t.objectType, t.objectId, t.relation),
  ]
);
