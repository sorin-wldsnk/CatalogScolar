CREATE TABLE "grade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"teacher_user_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"semester" smallint NOT NULL,
	"value_numeric" numeric(4, 2),
	"value_qualitative" text,
	"grade_type" text DEFAULT 'REGULAR' NOT NULL,
	"weight" numeric(3, 1) DEFAULT '1' NOT NULL,
	"notes" text,
	"graded_at" date DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "grade_semester_check" CHECK ("grade"."semester" IN (1, 2)),
	CONSTRAINT "grade_value_numeric_check" CHECK ("grade"."value_numeric" IS NULL OR ("grade"."value_numeric" >= 1 AND "grade"."value_numeric" <= 10)),
	CONSTRAINT "grade_value_qualitative_check" CHECK ("grade"."value_qualitative" IS NULL OR "grade"."value_qualitative" IN ('I', 'S', 'B', 'FB')),
	CONSTRAINT "grade_type_check" CHECK ("grade"."grade_type" IN ('REGULAR', 'THESIS', 'ORAL', 'PRACTICAL'))
);
--> statement-breakpoint
CREATE TABLE "absence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"teacher_user_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"semester" smallint NOT NULL,
	"absent_date" date NOT NULL,
	"period" smallint,
	"status" text DEFAULT 'UNEXCUSED' NOT NULL,
	"excused_by_user_id" uuid,
	"excused_at" timestamp with time zone,
	"excuse_reason" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "absence_semester_check" CHECK ("absence"."semester" IN (1, 2)),
	CONSTRAINT "absence_status_check" CHECK ("absence"."status" IN ('UNEXCUSED', 'EXCUSED', 'PENDING_EXCUSE')),
	CONSTRAINT "absence_period_check" CHECK ("absence"."period" IS NULL OR ("absence"."period" >= 1 AND "absence"."period" <= 8))
);
--> statement-breakpoint
CREATE TABLE "observation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"teacher_user_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"semester" smallint NOT NULL,
	"body" text NOT NULL,
	"is_visible_to_parent" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "observation_semester_check" CHECK ("observation"."semester" IN (1, 2))
);
--> statement-breakpoint
ALTER TABLE "grade" ADD CONSTRAINT "grade_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade" ADD CONSTRAINT "grade_enrollment_id_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade" ADD CONSTRAINT "grade_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade" ADD CONSTRAINT "grade_teacher_user_id_app_user_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade" ADD CONSTRAINT "grade_academic_year_id_academic_year_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_year"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence" ADD CONSTRAINT "absence_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence" ADD CONSTRAINT "absence_enrollment_id_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence" ADD CONSTRAINT "absence_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence" ADD CONSTRAINT "absence_teacher_user_id_app_user_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence" ADD CONSTRAINT "absence_academic_year_id_academic_year_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_year"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence" ADD CONSTRAINT "absence_excused_by_user_id_app_user_id_fk" FOREIGN KEY ("excused_by_user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation" ADD CONSTRAINT "observation_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation" ADD CONSTRAINT "observation_enrollment_id_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation" ADD CONSTRAINT "observation_teacher_user_id_app_user_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation" ADD CONSTRAINT "observation_academic_year_id_academic_year_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_year"("id") ON DELETE restrict ON UPDATE no action;