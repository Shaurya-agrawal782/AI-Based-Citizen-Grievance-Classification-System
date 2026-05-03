const fs = require('fs');
const path = require('path');

const generateData = () => {
  const grievances = [];
  let idCounter = 1;

  const add = (lang, category, priority, title, desc, critical, address, ward, zone) => {
    grievances.push({
      id: `B${idCounter.toString().padStart(3, '0')}`,
      language: lang,
      title,
      description: desc,
      expectedCategory: category,
      expectedPriority: priority,
      location: { address, ward, zone },
      locationContext: `${ward} ${zone}`,
      isCritical: critical
    });
    idCounter++;
  };

  // Helper arrays for random location
  const wards = ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5"];
  const zones = ["North", "South", "East", "West", "Central"];
  const randomLoc = () => ({
    address: `Street ${Math.floor(Math.random() * 100)}`,
    ward: wards[Math.floor(Math.random() * wards.length)],
    zone: zones[Math.floor(Math.random() * zones.length)]
  });

  // 30 English cases
  for (let i=0; i<6; i++) {
    const loc = randomLoc();
    add("English", "Electricity", "Normal", "Street light not working", "The street light in front of my house has been off for 3 days.", false, loc.address, loc.ward, loc.zone);
    add("English", "Water Supply", "Urgent", "No water supply", "We haven't received any water supply for the past two days.", false, loc.address, loc.ward, loc.zone);
    add("English", "Sanitation", "Normal", "Garbage not collected", "The garbage truck hasn't come for a week. Trash is piling up.", false, loc.address, loc.ward, loc.zone);
    add("English", "Roads", "Normal", "Potholes on main road", "There are several large potholes causing traffic blocks.", false, loc.address, loc.ward, loc.zone);
    add("English", "Public Safety", "Urgent", "Open manhole", "There is an open manhole without any warning signs.", false, loc.address, loc.ward, loc.zone);
  }

  // 30 Hindi cases
  for (let i=0; i<6; i++) {
    const loc = randomLoc();
    add("Hindi", "Electricity", "Normal", "बिजली नहीं है", "कल रात से बिजली नहीं आ रही है, कृपया ठीक करें।", false, loc.address, loc.ward, loc.zone);
    add("Hindi", "Water Supply", "Urgent", "पानी की समस्या", "नलों में पानी नहीं आ रहा है, हम बहुत परेशान हैं।", false, loc.address, loc.ward, loc.zone);
    add("Hindi", "Sanitation", "Normal", "कचरा पड़ा है", "सड़क पर कचरा फैला हुआ है, कोई सफाई नहीं कर रहा।", false, loc.address, loc.ward, loc.zone);
    add("Hindi", "Roads", "Normal", "सड़क खराब है", "सड़क में बहुत बड़े गड्ढे हैं, एक्सीडेंट हो सकता है।", false, loc.address, loc.ward, loc.zone);
    add("Hindi", "Public Safety", "Urgent", "खुला गड्ढा", "रास्ते में बड़ा गड्ढा खुला है, कोई भी गिर सकता है।", false, loc.address, loc.ward, loc.zone);
  }

  // 30 Hinglish cases
  for (let i=0; i<6; i++) {
    const loc = randomLoc();
    add("Hinglish", "Electricity", "Normal", "Light nahi aa rahi", "Kal raat se hamare area mein power cut hai.", false, loc.address, loc.ward, loc.zone);
    add("Hinglish", "Water Supply", "Urgent", "Pani supply band", "Bina bataye pani band kar diya, pareshani ho rahi hai.", false, loc.address, loc.ward, loc.zone);
    add("Hinglish", "Sanitation", "Normal", "Kachra uthao", "Nala overflow kar raha hai, bohot gandagi hai.", false, loc.address, loc.ward, loc.zone);
    add("Hinglish", "Roads", "Normal", "Sadak toot gayi", "Barish ki wajah se road pe bohot gaddhe ho gaye hain.", false, loc.address, loc.ward, loc.zone);
    add("Hinglish", "Public Safety", "Urgent", "Gutter open hai", "Main road pe gutter ka dhakkan nahi hai, dangerous hai.", false, loc.address, loc.ward, loc.zone);
  }

  // 15 Other / Ambiguous cases
  for (let i=0; i<15; i++) {
    const loc = randomLoc();
    add("Other", "Other", "Review", "Hello", "How do I use this app?", false, loc.address, loc.ward, loc.zone);
  }

  // 15 Critical safety cases
  for (let i=0; i<3; i++) {
    const loc = randomLoc();
    add("English", "Electricity", "Critical", "Transformer blast", "The transformer near the school exploded and wires are burning on the ground. Fire hazard!", true, loc.address, loc.ward, loc.zone);
    add("Hindi", "Public Safety", "Critical", "इमारत गिर रही है", "अस्पताल के पास की पुरानी इमारत ढहने वाली है, बहुत खतरा है!", true, loc.address, loc.ward, loc.zone);
    add("Hinglish", "Water Supply", "Critical", "Poisonous water", "Pipeline se kaala paani aur chemicals aa rahe hain, log bimar ho gaye.", true, loc.address, loc.ward, loc.zone);
    add("English", "Sanitation", "Critical", "Massive sewage flood", "Sewage water has entered houses, extreme health risk for everyone here.", true, loc.address, loc.ward, loc.zone);
    add("Hinglish", "Public Safety", "Critical", "Bridge falling", "Flyover mein crack aa gaya hai aur ek hissa toot ke gir gaya.", true, loc.address, loc.ward, loc.zone);
  }

  const dir = path.join(__dirname, '../data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(path.join(dir, 'grievanceBenchmark.json'), JSON.stringify(grievances, null, 2));
  console.log(`Generated ${grievances.length} benchmark items.`);
};

generateData();
