# Database Setup for Tour Booking System

## Required Database Tables

### 1. tour_slots table
This table stores tour booking information with duplicate prevention.

```sql
CREATE TABLE tour_slots (
  id SERIAL PRIMARY KEY,
  slot TIMESTAMPTZ NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on slot to prevent duplicates
CREATE UNIQUE INDEX tour_slots_slot_unique ON tour_slots(slot);
```

### 2. leads table (if not already exists)
This table stores contact form submissions and tour bookings.

```sql
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  source TEXT DEFAULT 'contact',
  preferred_date DATE,
  preferred_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Important Notes

1. **Unique Constraint**: The `tour_slots.slot` field has a UNIQUE constraint to prevent duplicate bookings for the same time slot.

2. **Timezone Handling**: The `slot` field uses `TIMESTAMPTZ` to handle timezone conversions properly.

3. **Automatic Prevention**: The application now checks for existing bookings before attempting to insert new ones, providing double protection against duplicates.

## Testing the System

1. Try booking the same time slot from two different browser sessions
2. The second booking should fail with a clear error message
3. The time slot should be marked as unavailable in the booking interface
4. After a conflict, the availability should refresh automatically

## Error Messages

- "This time slot is no longer available. Please select another time." - When slot is already booked
- "This time slot was just booked by another user. Please select a different time." - When duplicate constraint is triggered
