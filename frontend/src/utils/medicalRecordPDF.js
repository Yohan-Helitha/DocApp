import { jsPDF } from 'jspdf';

/**
 * Helper function to add patient profile section to PDF
 */
const addPatientProfileSection = (doc, patientData, margin, contentWidth, primaryColor, secondaryColor, textColor, lightGray) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 50;

  // Patient Profile Title
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('PATIENT INFORMATION', margin, yPosition);
  yPosition += 8;

  // Divider line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  // Patient profile info in two columns
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);

  const left = margin + 2;
  const right = margin + contentWidth / 2 + 2;
  const colWidth = contentWidth / 2 - 4;

  // Row 1: Name & DOB
  doc.setFont(undefined, 'bold');
  doc.setTextColor(108, 117, 125);
  doc.text('FULL NAME', left, yPosition);
  doc.text('DATE OF BIRTH', right, yPosition);
  yPosition += 3;

  doc.setFont(undefined, 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`${patientData.firstName} ${patientData.lastName}`, left, yPosition);
  const dob = new Date(patientData.dob).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  doc.text(dob, right, yPosition);
  yPosition += 5;

  // Row 2: Email & Gender
  doc.setFont(undefined, 'bold');
  doc.setTextColor(108, 117, 125);
  doc.text('EMAIL', left, yPosition);
  doc.text('GENDER', right, yPosition);
  yPosition += 3;

  doc.setFont(undefined, 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const emailText = doc.splitTextToSize(patientData.email, colWidth);
  doc.text(emailText, left, yPosition);
  doc.text(patientData.gender, right, yPosition);
  yPosition += 5;

  // Row 3: Phone & Blood Group
  doc.setFont(undefined, 'bold');
  doc.setTextColor(108, 117, 125);
  doc.text('PHONE', left, yPosition);
  doc.text('BLOOD GROUP', right, yPosition);
  yPosition += 3;

  doc.setFont(undefined, 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(patientData.phone, left, yPosition);
  doc.text(patientData.bloodGroup, right, yPosition);
  yPosition += 6;

  return yPosition;
};

/**
 * Generate a professional PDF for individual medical record with patient info
 * @param {Object} entry - Medical history entry object
 * @param {Object} patientData - Patient profile data
 * @returns {void} - Triggers PDF download
 */
export const generateMedicalRecordPDF = (entry, patientData = null) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const primaryColor = [11, 149, 136];
  const secondaryColor = [44, 62, 80];
  const textColor = [51, 51, 51];
  const lightGray = [245, 245, 245];

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // ===== HEADER SECTION =====
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('DocApp Healthcare', margin, 12);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('Medical Records Management System', margin, 18);

  doc.setFontSize(8);
  doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 12, { align: 'right' });
  doc.text(`Record ID: #${entry.history_id}`, pageWidth - margin, 18, { align: 'right' });

  let yPosition = 50;

  // ===== ADD PATIENT PROFILE SECTION IF PROVIDED =====
  if (patientData) {
    yPosition = addPatientProfileSection(doc, patientData, margin, contentWidth, primaryColor, secondaryColor, textColor, lightGray);
    yPosition += 4;
  }

  // ===== MEDICAL HISTORY TITLE =====
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('MEDICAL HISTORY RECORD', margin, yPosition);
  yPosition += 8;

  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  // ===== MEDICAL RECORD DETAILS =====
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  // Condition Name Section
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('CONDITION / DIAGNOSIS', margin + 2, yPosition + 5);
  yPosition += 8;

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  const conditionText = doc.splitTextToSize(entry.condition_name, contentWidth - 4);
  doc.text(conditionText, margin + 2, yPosition);
  yPosition += conditionText.length * 4 + 3;

  // Diagnosis Date Section
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('DATE OF DIAGNOSIS', margin + 2, yPosition + 5);
  yPosition += 8;

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  const diagnosisDate = new Date(entry.diagnosed_on).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(diagnosisDate, margin + 2, yPosition);
  yPosition += 6;

  // Status Section
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('CURRENT STATUS', margin + 2, yPosition + 5);
  yPosition += 8;

  const statusLabel = entry.status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const statusColors = {
    active: [230, 126, 34],
    chronic: [155, 89, 182],
    under_treatment: [52, 152, 219],
    resolved: [46, 204, 113],
    inactive: [108, 117, 125]
  };

  const statusColor = statusColors[entry.status] || [11, 149, 136];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.rect(margin + 2, yPosition - 2, 35, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.text(statusLabel, margin + 4, yPosition + 1);
  yPosition += 7;

  // Remarks Section
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('CLINICAL REMARKS', margin + 2, yPosition + 5);
  yPosition += 8;

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  const remarksText = doc.splitTextToSize(entry.remarks || 'No additional remarks', contentWidth - 4);
  doc.text(remarksText, margin + 2, yPosition);

  // ===== FOOTER SECTION =====
  const footerY = pageHeight - 25;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, footerY, pageWidth, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('CONFIDENTIAL - PATIENT MEDICAL RECORD', margin, footerY + 5);

  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.text(
    'This document is confidential and intended for authorized medical personnel only. Unauthorized distribution, copying, or access is strictly prohibited.',
    margin,
    footerY + 10,
    { maxWidth: contentWidth }
  );

  doc.setFontSize(8);
  doc.text(`Page 1 | Generated: ${new Date().toLocaleString()}`, pageWidth - margin, footerY + 20, {
    align: 'right'
  });

  // ===== TRIGGER DOWNLOAD =====
  const filename = `medical-record-${entry.condition_name.replace(/\s+/g, '-').toLowerCase()}-${entry.history_id}.pdf`;
  
  // Use output with bloburi for better compatibility
  const pdf = doc.output('bloburi');
  const link = document.createElement('a');
  link.href = pdf;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generate a comprehensive PDF with all medical records and patient profile
 * @param {Array} entries - Array of medical history entries
 * @param {Object} patientData - Patient profile data
 * @returns {void} - Triggers PDF download
 */
export const generateAllMedicalRecordsPDF = (entries, patientData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const primaryColor = [11, 149, 136];
  const secondaryColor = [44, 62, 80];
  const textColor = [51, 51, 51];
  const lightGray = [245, 245, 245];

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // ===== PAGE 1: HEADER + PATIENT PROFILE =====
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('DocApp Healthcare', margin, 12);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('Medical Records Management System', margin, 18);

  doc.setFontSize(8);
  doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 12, { align: 'right' });
  doc.text('Complete Medical History', pageWidth - margin, 18, { align: 'right' });

  let yPosition = addPatientProfileSection(doc, patientData, margin, contentWidth, primaryColor, secondaryColor, textColor, lightGray);
  yPosition += 8;

  // ===== ALL RECORDS SECTION =====
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('ALL MEDICAL HISTORY RECORDS', margin, yPosition);
  yPosition += 8;

  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  // ===== RECORDS TABLE/LIST =====
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);

  entries.forEach((entry, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = margin;
    }

    // Record header with number
    doc.setFont(undefined, 'bold');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(10);
    doc.text(`Record ${index + 1}`, margin, yPosition);
    yPosition += 5;

    // Record details
    doc.setFont(undefined, 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(8);

    // Condition
    doc.setFont(undefined, 'bold');
    doc.setTextColor(108, 117, 125);
    doc.text('Condition:', margin + 2, yPosition);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const conditionText = doc.splitTextToSize(entry.condition_name, contentWidth - 25);
    doc.text(conditionText, margin + 25, yPosition);
    yPosition += conditionText.length * 3 + 2;

    // Diagnosis Date
    const diagnosisDate = new Date(entry.diagnosed_on).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    doc.setFont(undefined, 'bold');
    doc.setTextColor(108, 117, 125);
    doc.text('Diagnosed:', margin + 2, yPosition);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(diagnosisDate, margin + 25, yPosition);
    yPosition += 4;

    // Status with color badge
    doc.setFont(undefined, 'bold');
    doc.setTextColor(108, 117, 125);
    doc.text('Status:', margin + 2, yPosition);

    const statusLabel = entry.status
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const statusColors = {
      active: [230, 126, 34],
      chronic: [155, 89, 182],
      under_treatment: [52, 152, 219],
      resolved: [46, 204, 113],
      inactive: [108, 117, 125]
    };

    const statusColor = statusColors[entry.status] || [11, 149, 136];
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.rect(margin + 25, yPosition - 2.5, 30, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(7);
    doc.text(statusLabel, margin + 26.5, yPosition, { align: 'center' });
    yPosition += 5;

    // Remarks
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(108, 117, 125);
    doc.text('Remarks:', margin + 2, yPosition);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(8);
    const remarksText = doc.splitTextToSize(entry.remarks || 'No remarks', contentWidth - 25);
    doc.text(remarksText, margin + 25, yPosition);
    yPosition += remarksText.length * 3 + 4;

    // Divider between records
    yPosition += 2;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
    yPosition += 3;
  });

  // ===== FOOTER SECTION =====
  const footerY = pageHeight - 25;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, footerY, pageWidth, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('CONFIDENTIAL - PATIENT MEDICAL RECORDS', margin, footerY + 5);

  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.text(
    'This document is confidential and intended for authorized medical personnel only. Unauthorized distribution, copying, or access is strictly prohibited.',
    margin,
    footerY + 10,
    { maxWidth: contentWidth }
  );

  doc.setFontSize(8);
  doc.text(`Pages: ${doc.internal.pages.length - 1} | Generated: ${new Date().toLocaleString()}`, pageWidth - margin, footerY + 20, {
    align: 'right'
  });

  // ===== TRIGGER DOWNLOAD =====
  const filename = `medical-history-complete-${patientData.firstName.toLowerCase()}-${patientData.lastName.toLowerCase()}.pdf`;
  
  // Use output with bloburi for better compatibility
  const pdf = doc.output('bloburi');
  const link = document.createElement('a');
  link.href = pdf;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default generateMedicalRecordPDF;
