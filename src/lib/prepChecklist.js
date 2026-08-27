// Sourced from CAL FIRE's "Ready, Set, Go!" program (readyforwildfire.org —
// the emergency supply kit / "Go Bag" guidance and its 3-phase Ready/Set/Go
// framing) and ready.gov/wildfires (before/during/after guidance). Transcribed
// from the real published guidance, same sourcing discipline as the CDE
// activity table in riskScoring.js — not invented, and not exhaustive of
// either source, just the concrete, checkable actions they both call out.
export const PREP_PHASES = [
  { id: "ready", label: "Ready — before fire season" },
  { id: "gobag", label: "Set — build your Go Bag" },
  { id: "during", label: "Go — during a wildfire" },
  { id: "after", label: "After a wildfire" },
];

export const PREP_ITEMS = [
  // Ready — CAL FIRE "Ready, Set, Go!": prepare your home and household before there's a fire nearby.
  { id: "ready-routes", phase: "ready", text: "Learn at least two evacuation routes out of your neighborhood.", source: "readyforwildfire.org" },
  { id: "ready-plan", phase: "ready", text: "Agree on a family meeting place and an out-of-area contact person.", source: "ready.gov/wildfires" },
  { id: "ready-docs", phase: "ready", text: "Put critical documents (ID, insurance, deeds) in a fire safe or somewhere easy to grab.", source: "ready.gov/wildfires" },
  { id: "ready-insurance", phase: "ready", text: "Check your homeowner's/renter's insurance coverage before fire season, not after.", source: "ready.gov/wildfires" },
  { id: "ready-pets", phase: "ready", text: "Plan for pets and livestock — where they'd go and how you'd transport them.", source: "readyforwildfire.org" },

  // Set / Go Bag — the CAL FIRE emergency supply kit.
  { id: "gobag-water", phase: "gobag", text: "Water — enough for each household member for several days.", source: "readyforwildfire.org" },
  { id: "gobag-food", phase: "gobag", text: "Non-perishable food and a manual can opener.", source: "readyforwildfire.org" },
  { id: "gobag-meds", phase: "gobag", text: "Current medications and copies of prescriptions.", source: "readyforwildfire.org" },
  { id: "gobag-firstaid", phase: "gobag", text: "First aid kit.", source: "readyforwildfire.org" },
  { id: "gobag-light", phase: "gobag", text: "Flashlight with extra batteries.", source: "readyforwildfire.org" },
  { id: "gobag-radio", phase: "gobag", text: "Battery-operated radio.", source: "readyforwildfire.org" },
  { id: "gobag-masks", phase: "gobag", text: "N95 masks or face coverings that protect against fine smoke particles.", source: "readyforwildfire.org" },
  { id: "gobag-charger", phase: "gobag", text: "Phone chargers (and a backup battery pack if you have one).", source: "readyforwildfire.org" },
  { id: "gobag-clothes", phase: "gobag", text: "A change of sturdy clothing and closed-toe shoes per person.", source: "readyforwildfire.org" },
  { id: "gobag-cash", phase: "gobag", text: "Some cash — card readers may not work if power is out.", source: "readyforwildfire.org" },
  { id: "gobag-pets", phase: "gobag", text: "Pet food, water, and supplies if you have animals.", source: "readyforwildfire.org" },

  // Go — during an active wildfire.
  { id: "during-listen", phase: "during", text: "Follow instructions from local officials — they know the specific threat to your area.", source: "ready.gov/wildfires" },
  { id: "during-leave-early", phase: "during", text: "Leave early if you're advised to — don't wait to see how bad it gets.", source: "readyforwildfire.org" },
  { id: "during-close-up", phase: "during", text: "Shut all windows and interior doors, close fireplace dampers, remove flammable curtains/blinds if time allows.", source: "ready.gov/wildfires" },

  // After.
  { id: "after-wait", phase: "after", text: "Wait for public officials to confirm it's safe before returning home.", source: "ready.gov/wildfires" },
  { id: "after-inspect", phase: "after", text: "If your home was damaged, don't re-enter until it's inspected by a qualified professional.", source: "ready.gov/wildfires" },
];
