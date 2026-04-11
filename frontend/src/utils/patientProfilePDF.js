import { jsPDF } from 'jspdf';

/**
 * Generate a professional PDF for patient profile
 * @param {Object} patient - Patient profile object
 * @param {string} patient.firstName - First name
 * @param {string} patient.lastName - Last name
 * @param {string} patient.email - Email address
 * @param {string} patient.phone - Phone number
 * @param {string} patient.dob - Date of birth
 * @param {string} patient.gender - Gender
 * @param {string} patient.bloodGroup - Blood group
 * @param {string} patient.address - Address
 * @param {string} patient.allergies - Allergies
 * @param {string} patient.emergencyContactName - Emergency contact name
 * @param {string} patient.emergencyContactPhone - Emergency contact phone
 * @returns {void} - Triggers PDF download
 */
export const generatePatientProfilePDF = (patient) => {
  // Create PDF document in portrait mode with mm units
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Get current date
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Set colors
  const primaryColor = [11, 149, 136]; // Teal - primary (#0B9588)
  const secondaryColor = [44, 62, 80]; // Dark blue - secondary
  const textColor = [51, 51, 51]; // Dark gray
  const lightGray = [245, 245, 245]; // Light background

  // PAGE WIDTH AND MARGINS
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // ===== HEADER SECTION =====
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Hospital/Clinic name (top left)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('DocApp Healthcare', margin, 12);

  // Subtitle (top left)
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('Patient Profile Document', margin, 18);

  // Date generated (top right)
  doc.setFontSize(8);
  doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 12, { align: 'right' });
  doc.text('Patient Record', pageWidth - margin, 18, { align: 'right' });

  yPosition = 50;

  // ===== PATIENT NAME SECTION =====
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(`${patient.firstName} ${patient.lastName}`, margin, yPosition);
  yPosition += 8;

  // Divider line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // ===== PERSONAL INFORMATION SECTION =====
  doc.setTextColor(...textColor);
  doc.setFillColor(...lightGray);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...secondaryColor);
  doc.text('PERSONAL INFORMATION', margin + 3, yPosition + 5.5);
  yPosition += 10;

  doc.setTextColor(...textColor);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);

  // Two column layout for personal info
  const left = margin + 3;
  const right = margin + contentWidth / 2 + 3;
  const colWidth = contentWidth / 2 - 6;

  // Row 1: Date of Birth & Gender
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(108, 117, 125); // Slate color for labels
  doc.text('DATE OF BIRTH', left, yPosition);
  doc.text('GENDER', right, yPosition);
  yPosition += 4;
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  const dobFormatted = new Date(patient.dob).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(dobFormatted, left, yPosition);
  doc.text(patient.gender, right, yPosition);
  yPosition += 7;

  // Row 2: Blood Group & Email
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(108, 117, 125);
  doc.text('BLOOD GROUP', left, yPosition);
  doc.text('EMAIL', right, yPosition);
  yPosition += 4;
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.text(patient.bloodGroup, left, yPosition);
  const emailText = doc.splitTextToSize(patient.email, colWidth);
  doc.text(emailText, right, yPosition);
  yPosition += 7;

  // Row 3: Phone & Address
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(108, 117, 125);
  doc.text('PHONE', left, yPosition);
  doc.text('ADDRESS', right, yPosition);
  yPosition += 4;
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.text(patient.phone, left, yPosition);
  const addressText = doc.splitTextToSize(patient.address, colWidth);
  doc.text(addressText, right, yPosition);
  yPosition += Math.max(7, addressText.length * 3.5);

  // Row 4: Allergies (full width)
  yPosition += 2;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(108, 117, 125);
  doc.text('ALLERGIES', left, yPosition);
  yPosition += 4;
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  const allergiesText = doc.splitTextToSize(patient.allergies || 'No known allergies', contentWidth - 6);
  doc.text(allergiesText, left, yPosition);
  yPosition += allergiesText.length * 3.5 + 5;

  // ===== EMERGENCY CONTACT SECTION =====
  yPosition += 3;
  doc.setFillColor(...lightGray);
  doc.rect(margin, yPosition, contentWidth, 8, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...secondaryColor);
  doc.text('EMERGENCY CONTACT', margin + 3, yPosition + 5.5);
  yPosition += 10;

  doc.setTextColor(...textColor);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);

  // Emergency Contact Name
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(108, 117, 125);
  doc.text('NAME', left, yPosition);
  doc.text('PHONE', right, yPosition);
  yPosition += 4;
  
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.text(patient.emergencyContactName, left, yPosition);
  doc.text(patient.emergencyContactPhone, right, yPosition);
  yPosition += 8;

  // ===== FOOTER SECTION =====
  const footerY = pageHeight - 25;
  doc.setFillColor(...primaryColor);
  doc.rect(0, footerY, pageWidth, 25, 'F');

  // Confidentiality notice
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('CONFIDENTIAL - PATIENT MEDICAL PROFILE', margin, footerY + 5);

  // Additional footer info
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.text(
    'This document is confidential and intended for authorized medical personnel only. Unauthorized distribution, copying, or access is strictly prohibited.',
    margin,
    footerY + 10,
    { maxWidth: contentWidth }
  );

  // Page number and generated info
  doc.setFontSize(8);
  doc.text(`Page 1 | Generated: ${new Date().toLocaleString()}`, pageWidth - margin, footerY + 20, {
    align: 'right'
  });

  // ===== TRIGGER DOWNLOAD =====
  const filename = `patient-profile-${patient.firstName.toLowerCase()}-${patient.lastName.toLowerCase()}.pdf`;
  doc.save(filename);
};

export default generatePatientProfilePDF;
