import { pgTable, serial, timestamp, varchar, integer, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 打卡记录表
export const checkinRecords = pgTable(
  "checkin_records",
  {
    id: serial().primaryKey(),
    // 体重，单位kg
    weight: varchar("weight", { length: 10 }),
    // BMI值
    bmi: varchar("bmi", { length: 10 }),
    // 体脂率，单位%
    body_fat: varchar("body_fat", { length: 10 }),
    // 腰围，单位cm
    waist_circumference: varchar("waist_circumference", { length: 10 }),
    // 血压，收缩压/舒张压
    blood_pressure: varchar("blood_pressure", { length: 20 }),
    // 备注
    note: varchar("note", { length: 500 }),
    // 打卡日期
    checkin_date: varchar("checkin_date", { length: 20 }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("checkin_records_date_idx").on(table.checkin_date), // 日期过滤字段
    index("checkin_records_created_at_idx").on(table.created_at), // 排序字段
  ]
);
