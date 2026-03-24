export const validateAttempt = (data) => {
  const errors = [];
  if (!data.notification_id) errors.push("notification_id is required");
  if (!data.status) errors.push("status is required");
  
  const validStatuses = ['queued', 'sent', 'delivered', 'failed'];
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  return errors.length > 0 ? errors.join(", ") : null;
};
