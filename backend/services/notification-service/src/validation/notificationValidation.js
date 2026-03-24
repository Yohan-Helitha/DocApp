export const validateNotification = (data) => {
  const errors = [];
  if (!data.recipient_user_id) errors.push("recipient_user_id is required");
  if (!data.channel) errors.push("channel is required");
  if (!data.message && !data.template_code) errors.push("Either message or template_code must be provided");
  
  const validChannels = ['email', 'sms', 'in-app'];
  if (data.channel && !validChannels.includes(data.channel)) {
    errors.push(`Invalid channel. Must be one of: ${validChannels.join(', ')}`);
  }

  return errors.length > 0 ? errors.join(", ") : null;
};
