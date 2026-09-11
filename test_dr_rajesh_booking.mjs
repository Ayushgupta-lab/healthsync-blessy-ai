// Test script: Validate Doctor Availability & 1-Hour Appointment Booking with Dr. Rajesh Patel
import { blessyConversationEngine } from './src/engines/blessyConversationEngine.js';
import { storageService } from './src/services/storageService.js';

async function runTests() {
  console.log("=================================================================");
  console.log("TEST 1: Doctor Free Timings / Availability Query in Hindi");
  console.log("Query: 'Dr. Rajesh kab free hain?'");
  console.log("=================================================================");

  const res1 = await blessyConversationEngine.processMessageAsync("Dr. Rajesh kab free hain?");
  console.log("Type:", res1.type);
  console.log("Message:\n", res1.message);
  console.log("Action Chips:", res1.actionChips);

  if (res1.type !== 'doctor_free_schedule' || !res1.message.includes("Dr. Rajesh Patel")) {
    console.error("❌ TEST 1 FAILED: Expected doctor_free_schedule for Dr. Rajesh Patel");
    process.exit(1);
  }
  console.log("✅ TEST 1 PASSED: Doctor schedule returned correctly with available slots.\n");

  console.log("=================================================================");
  console.log("TEST 2: Doctor Free Timings with Generic 'Doctor kitne baje free honge?'");
  console.log("=================================================================");

  const res2 = await blessyConversationEngine.processMessageAsync("Doctor kitne baje free honge?");
  console.log("Type:", res2.type);
  console.log("Message preview:\n", res2.message.substring(0, 150) + "...");
  if (res2.type !== 'doctor_free_schedule') {
    console.error("❌ TEST 2 FAILED: Expected doctor_free_schedule");
    process.exit(1);
  }
  console.log("✅ TEST 2 PASSED: Free timings displayed for doctor.\n");

  console.log("=================================================================");
  console.log("TEST 3: Direct Appointment Booking for 1 Hour with Bill Calculation");
  console.log("User Voice Instruction: 'Dr. Rajesh se meri appointment book kar do 3 baje ki, 1 ghanta lagega'");
  console.log("=================================================================");

  blessyConversationEngine.setUserContext({
    id: 'pat_ayush_01',
    fullName: 'Ayush Patient',
    phone: '+91 98765 43210',
    role: 'patient'
  });

  const res3 = await blessyConversationEngine.processMessageAsync("Dr. Rajesh se meri appointment book kar do 3 baje ki, 1 ghanta lagega");
  console.log("Type:", res3.type);
  console.log("Message:\n", res3.message);
  console.log("Booking Data:", res3.data);

  if (res3.type !== 'booking_confirmed') {
    console.error("❌ TEST 3 FAILED: Expected booking_confirmed, got:", res3.type);
    process.exit(1);
  }

  // Check appointment in storage
  const appointments = storageService.getAppointments();
  const bookedApt = appointments.find(a => a.id === res3.data?.id);

  if (!bookedApt) {
    console.error("❌ TEST 3 FAILED: Appointment not found in storageService!");
    process.exit(1);
  }

  console.log("\n📋 Saved DB Record:", bookedApt);
  console.log("• Doctor ID:", bookedApt.doctorId);
  console.log("• Time:", bookedApt.time);
  console.log("• Duration:", bookedApt.durationMinutes, "minutes");
  console.log("• Fee:", bookedApt.fee);

  if (bookedApt.doctorId !== 'doc_patel') {
    console.error("❌ TEST 3 FAILED: Expected doctorId doc_patel, got:", bookedApt.doctorId);
    process.exit(1);
  }
  if (bookedApt.time !== '15:00') {
    console.error("❌ TEST 3 FAILED: Expected time 15:00, got:", bookedApt.time);
    process.exit(1);
  }
  if (bookedApt.durationMinutes !== 60) {
    console.error("❌ TEST 3 FAILED: Expected durationMinutes 60, got:", bookedApt.durationMinutes);
    process.exit(1);
  }
  if (!bookedApt.fee.includes('1,800')) {
    console.error("❌ TEST 3 FAILED: Expected fee ₹1,800 for 1 hour (2 slots x ₹900), got:", bookedApt.fee);
    process.exit(1);
  }

  console.log("✅ TEST 3 PASSED: 1-hour appointment booked with Dr. Rajesh at 15:00 (3:00 PM) with ₹1,800 bill!\n");

  console.log("=================================================================");
  console.log("TEST 4: Conflict Handling on Duplicate Occupied Slot");
  console.log("=================================================================");

  const res4Conflict = await blessyConversationEngine.processMessageAsync("confirm_time_15:00_60");
  console.log("Type:", res4Conflict.type);
  console.log("Message:\n", res4Conflict.message);
  console.log("Action Chips:", res4Conflict.actionChips);
  if (res4Conflict.type !== 'booking_conflict') {
    console.error("❌ TEST 4A FAILED: Expected booking_conflict on occupied slot");
    process.exit(1);
  }
  console.log("✅ TEST 4A PASSED: Conflict accurately detected for duplicate slot with alternative options offered.\n");

  console.log("=================================================================");
  console.log("TEST 4B: Action Chip Confirmation for Open Slot 'confirm_time_16:00_60'");
  console.log("=================================================================");

  const res4 = await blessyConversationEngine.processMessageAsync("confirm_time_16:00_60");
  console.log("Type:", res4.type);
  console.log("Booking Data Fee:", res4.data?.fee);
  console.log("Duration:", res4.data?.durationMinutes);
  if (res4.type !== 'booking_confirmed' || res4.data?.durationMinutes !== 60) {
    console.error("❌ TEST 4B FAILED");
    process.exit(1);
  }
  console.log("✅ TEST 4B PASSED: Action chip confirm_time_16:00_60 accurately booked 60-min slot!\n");

  console.log("=================================================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY! 🚀");
  console.log("=================================================================");
}

runTests().catch(err => {
  console.error("Test Error:", err);
  process.exit(1);
});
