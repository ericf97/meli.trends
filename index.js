require('dotenv').config();
const axios = require('axios').default;
const xl = require('excel4node');

const { URLMELI, APPKEY } = process.env;
//we declare categories ids here 
// MLA3502 <-- 'Accesorios para Celulares'
const categoriesIds = ['MLA3502', 'MLA417704'];

async function init() {

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

  const itemsInfo = await axios.get(`${URLMELI}/items?ids=${topSellItems.map(i => i.id).join(',')}`);

  for (let k = 0; k < itemsInfo.data.length; k++) {
    const item = itemsInfo.data[k];

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
