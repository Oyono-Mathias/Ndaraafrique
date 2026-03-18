
'use server';

import type { NdaraUser, Course } from "@/lib/types";

/**
 * @fileOverview Système d'emails multilingue Ndara Afrique.
 * ✅ i18n : Templates adaptatifs en FR, EN et SG.
 */

const LOCALIZED_STRINGS: Record<string, any> = {
    fr: {
        welcome: "Félicitations",
        enrolled_msg: "Bienvenue ! Vous êtes maintenant inscrit(e) à la formation :",
        access_btn: "Accéder au cours",
        quote: "Bara ala, Tonga na ndara.",
        new_enrollment: "Nouvelle Inscription !",
        instructor_hi: "Bonjour",
        instructor_msg: "Bonne nouvelle ! Un nouvel étudiant vient de rejoindre l'une de vos formations.",
        student_label: "Étudiant",
        course_label: "Formation"
    },
    en: {
        welcome: "Congratulations",
        enrolled_msg: "Welcome! You are now enrolled in the following training:",
        access_btn: "Access Course",
        quote: "Bara ala, Tonga na ndara.",
        new_enrollment: "New Enrollment!",
        instructor_hi: "Hello",
        instructor_msg: "Good news! A new student has just joined one of your courses.",
        student_label: "Student",
        course_label: "Course"
    },
    sg: {
        welcome: "Mo sara kua nzoni",
        enrolled_msg: "Bara ala! Mo lî nzoni na yâ tî kua so :",
        access_btn: "To nda tî kua",
        quote: "Bara ala, Tonga na ndara.",
        new_enrollment: "Fini Ndara !",
        instructor_hi: "Bara",
        instructor_msg: "Nzoni sango! Mbeni fini Ndara alî fafadesi na yâ tî kua tî mo.",
        student_label: "Ndara",
        course_label: "Kua"
    }
};

const sendEmail = ({ to, subject, html }: { to: string, subject: string, html: string }) => {
    console.log("--- Sending Localized Email ---");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("------------------------------");
    return Promise.resolve({ success: true });
}

const getStudentEmailTemplate = (studentName: string, courseName: string, courseId: string, locale: string = 'fr'): string => {
    const s = LOCALIZED_STRINGS[locale] || LOCALIZED_STRINGS.fr;
    const courseUrl = `https://ndara-afrique.web.app/${locale}/courses/${courseId}`;
    
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #020617; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${s.welcome}, ${studentName} !</h1>
        </div>
        <div style="padding: 30px;">
          <p>${s.enrolled_msg}</p>
          <h2 style="font-size: 20px; margin: 20px 0; color: #10b981;">${courseName}</h2>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${courseUrl}" style="background-color: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; text-transform: uppercase;">${s.access_btn}</a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="font-style: italic; color: #555; margin-top: 20px; text-align: center;">
            "${s.quote}"
          </p>
        </div>
      </div>
    `;
};

const getInstructorEmailTemplate = (instructorName: string, studentName: string, courseName: string, locale: string = 'fr'): string => {
    const s = LOCALIZED_STRINGS[locale] || LOCALIZED_STRINGS.fr;
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${s.new_enrollment}</h1>
        </div>
        <div style="padding: 30px;">
          <p>${s.instructor_hi} ${instructorName},</p>
          <p>${s.instructor_msg}</p>
          <p style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; border-left: 4px solid #10b981;">
            <strong>${s.student_label} :</strong> ${studentName}<br>
            <strong>${s.course_label} :</strong> ${courseName}
          </p>
        </div>
      </div>
    `;
};

export const sendEnrollmentEmails = async (student: NdaraUser, course: Course, instructor: NdaraUser) => {
    if (!student.email || !instructor.email) return;

    const studentLocale = student.preferredLanguage || 'fr';
    const instructorLocale = instructor.preferredLanguage || 'fr';

    // 1. Email to Student
    await sendEmail({
        to: student.email,
        subject: `[Ndara Afrique] ${course.title}`,
        html: getStudentEmailTemplate(student.fullName, course.title, course.id, studentLocale),
    });

    // 2. Email to Instructor
    await sendEmail({
        to: instructor.email,
        subject: `[Ndara Afrique] ${LOCALIZED_STRINGS[instructorLocale]?.new_enrollment || 'New Student'}`,
        html: getInstructorEmailTemplate(instructor.fullName, student.fullName, course.title, instructorLocale),
    });
};
