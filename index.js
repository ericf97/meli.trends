require('dotenv').config();
const axios = require('axios').default;
const xl = require('excel4node');

const { URLMELI, APPKEY } = process.env;
//we declare categories ids here 
// MLA1051   <-- 'Celulares y telefonos'
// MLA3502   <-- 'Accesorios para Celulares'
// MLA434353 <-- 'Mallas'
// MLA3517   <-- 'Cargadores'
// MLA417718 <-- 'Protectores de Pantalla'
// MLA1049   <-- 'Accesorios para Cámaras'
// MLA3518   <-- 'Auriculares y Manos Libres'
// MLA430918 <-- 'Cables y Hubs USB'
// MLA3813   <-- 'Repuestos de Celulares'
const categoriesIds = ['MLA1051', 'MLA3502', 'MLA434353', 'MLA3517', 'MLA417718', 'MLA1049', 'MLA3518', 'MLA430918', 'MLA3813'];

async function init() {

  console.log('++++++========+=========++++++');
  console.log('WORKING');

  let results = [];
  let topSellItems = [];

  for (let i = 0; i < categoriesIds.length; i++) {

    let categoryId = categoriesIds[i];

    const responseTopSells = await axios.get(`${URLMELI}/highlights/MLA/category/${categoryId}`, {
      headers: {
        'Authorization': `Bearer ${APPKEY}`
      }
    });

    topSellItems.push(...responseTopSells.data.content.filter(i => i.type === 'ITEM'));
  };

  let itemsInfo = [];

  for (let j = 0; j < topSellItems.length / 19; j++) {

    let sellSlice = topSellItems.slice(19 * j, (19 * j) + 19);

    let resultItems = await axios.get(`${URLMELI}/items?ids=${sellSlice.map(i => i.id).join(',')}`);

    itemsInfo.push(...resultItems.data);
  }

  for (let k = 0; k < itemsInfo.length; k++) {
    const item = itemsInfo[k];

    const views = await axios.get(`${URLMELI}/visits/items?ids=${item.body.id}`, {
      headers: {
        'Authorization': `Bearer ${APPKEY}`
      }
    });

    results.push({...item.body, visits: views.data});
  }

  console.log('++++++========+=========++++++');
  console.log('ALEADY GOT ALL DATA');

  saveToXls(results);
}

//BY chat GPT
function saveToXls(data) {
  const XLSX = require('xlsx');

  // Create a workbook object
  const workbook = XLSX.utils.book_new();

  sanitizeObject(data);
  // Convert the data array to a worksheet object
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // Write the workbook to a file
  XLSX.writeFile(workbook, 'data.xlsx');
}

function sanitizeObject(data) {
  data.forEach(element => {

    Object.keys(element).forEach(key => {

      if(typeof element[key] === 'object') {
        if(element[key]) {
          let stringified = JSON.stringify(element[key]);

          //xlsx throw an error when text exceed this caracters
          if(stringified.length < 32767) {
            element[key] = stringified;
          }
        }
      }
    });
  });
}

init();
