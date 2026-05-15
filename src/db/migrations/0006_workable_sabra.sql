CREATE TABLE "teacher_subject" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"teacher_user_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "teacher_subject_unique" UNIQUE("school_id","teacher_user_id","subject_id")
);
--> statement-breakpoint
ALTER TABLE "teacher_subject" ADD CONSTRAINT "teacher_subject_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject" ADD CONSTRAINT "teacher_subject_teacher_user_id_app_user_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject" ADD CONSTRAINT "teacher_subject_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;