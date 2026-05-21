const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendAppointmentPaidEmail(appointment) {
  if (!appointment?.email) return;

  await resend.emails.send({
    from: "Real Barbers <onboarding@resend.dev>",
    to: appointment.email,
    subject: "Your Real Barbers appointment is confirmed!",
    html: `
      <h2>Appointment Confirmed</h2>

      <p>Hi ${appointment.fullName || "Customer"},</p>

      <p>Your payment was successful and your appointment is now confirmed.</p>

      <p><strong>Date:</strong> ${appointment.date}</p>
      <p><strong>Time:</strong> ${appointment.time}</p>
      <p><strong>Amount Paid:</strong> ₱${appointment.amountPaid || appointment.amount || 150}</p>

      <br />

      <p>Please arrive 10 minutes early.</p>

      <p>Thank you,<br />Real Barbers</p>
    `,
  });
}

module.exports = { sendAppointmentPaidEmail };