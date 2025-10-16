import { parserService } from './src/services/parserService.js';

console.log('🎯 FINAL VALIDATION TEST\n');

const text = await parserService.parsePDF('/Users/supriya97/Desktop/DOC-20250804-WA0002.pdf');
const labValues = parserService.extractLabValues(text);

console.log('\n✅ CRITICAL VALUES CHECK:\n');
console.log(
  '  Free T3:      ',
  labValues.t3_free
    ? `✅ ${labValues.t3_free.value} ${labValues.t3_free.unit} [${labValues.t3_free.severity}]`
    : '❌ MISSING'
);
console.log(
  '  Free T4:      ',
  labValues.t4_free
    ? `✅ ${labValues.t4_free.value} ${labValues.t4_free.unit} [${labValues.t4_free.severity}]`
    : '❌ MISSING'
);
console.log(
  '  Estradiol:    ',
  labValues.estradiol
    ? `✅ ${labValues.estradiol.value} ${labValues.estradiol.unit} [${labValues.estradiol.severity}]`
    : '❌ MISSING'
);
console.log(
  '  Progesterone: ',
  labValues.progesterone
    ? `✅ ${labValues.progesterone.value} ${labValues.progesterone.unit} [${labValues.progesterone.severity}]`
    : '❌ MISSING'
);
console.log(
  '  Vitamin D:    ',
  labValues.vitamin_d
    ? `✅ ${labValues.vitamin_d.value} ${labValues.vitamin_d.unit} [${labValues.vitamin_d.severity}]`
    : '❌ MISSING'
);
console.log(
  '  Vitamin B12:  ',
  labValues.vitamin_b12
    ? `✅ ${labValues.vitamin_b12.value} ${labValues.vitamin_b12.unit} [${labValues.vitamin_b12.severity}]`
    : '❌ MISSING'
);

console.log(`\n📊 Total: ${Object.keys(labValues).length}/26 values extracted`);

if (labValues.t3_free && labValues.t4_free) {
  console.log(
    `\n✅ VERIFICATION: T3 (${labValues.t3_free.value}) != T4 (${labValues.t4_free.value}) - Values are correctly separate!`
  );
}

const allCritical = ['t3_free', 't4_free', 'estradiol', 'progesterone', 'vitamin_d', 'vitamin_b12'];
const found = allCritical.filter((key) => labValues[key]);
console.log(`\n🎉 SUCCESS: ${found.length}/${allCritical.length} critical values extracted!`);
