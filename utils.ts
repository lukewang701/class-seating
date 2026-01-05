import { ClassData } from './types';

// Helper to format student name with parenthesis handling and leading number stripping
export const formatStudentName = (name: string): string => {
  // Remove parentheses and content inside
  const match = name.match(/^([^()]+)(\(([^)]+)\))?$/);
  let base = match ? match[1].trim() : name.trim();
  // Strip leading numbers like "01 ", "01.", "1 "
  return base.replace(/^\d+[\s.]*/, '');
};

export const getExportFileName = (className: string) => {
  const date = new Date().toISOString().slice(0, 10);
  return `${className || '座位表'}_${date}.json`;
};

export const generatePrintContent = (data: ClassData, isTeacherView: boolean) => {
  const title = isTeacherView
    ? `${data.name} 座位表 (導師：${data.teacherName || ''})`
    : `${data.name} 座位表 (學生視角)`;

  // Create a mapping for student seat numbers (2-digit padded)
  const studentToNumberMap: Record<string, string> = {};
  data.students.forEach((name, index) => {
    studentToNumberMap[name] = (index + 1).toString().padStart(2, '0');
  });

  // Calculate grid
  let rowsArr: number[] = [];
  for (let r = 1; r <= data.rows; r++) rowsArr.push(r);
  
  let colsArr: number[] = [];
  for (let c = 1; c <= data.cols; c++) colsArr.push(c);

  const displayRows = isTeacherView ? [...rowsArr].reverse() : rowsArr;
  const displayCols = isTeacherView ? [...colsArr].reverse() : colsArr;

  const gap = 8; 
  // Optimization for A4 width (approx 200mm usable after 0.5cm margins)
  const seatWidth = Math.floor(720 / data.cols) - gap;
  const seatHeight = Math.floor(seatWidth * 2 / 3);

  let gridHtml = `<div style="display: flex; flex-direction: column; align-items: center; gap: ${gap}px; width: 100%;">`;

  displayRows.forEach(r => {
    gridHtml += `<div style="display: flex; gap: ${gap}px;">`;
    displayCols.forEach(c => {
      const seatId = `${r}-${c}`;
      const student = data.seatingArrangement[seatId];
      const isLocked = data.lockedSeats.has(seatId);
      
      let cellContent = '';
      let cellStyle = `width: ${seatWidth}px; height: ${seatHeight}px; border: 1.5px solid #000; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; overflow: hidden;`;
      
      if (isLocked) {
         cellStyle += `background-color: #fff; color: #991b1b; font-size: ${Math.floor(seatHeight * 0.5)}px;`;
         cellContent = '✖';
      } else if (student) {
         const seatNum = studentToNumberMap[student] || '';
         cellStyle += `background-color: #fff; color: #000; padding: 2px; line-height: 1.2;`;
         cellContent = `
            <div style="font-size: ${Math.floor(seatHeight * 0.28)}px; color: #444; font-weight: normal; margin-bottom: 2px;">${seatNum}</div>
            <div style="font-size: ${Math.floor(seatHeight * 0.38)}px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 95%;">${formatStudentName(student)}</div>
         `;
      } else {
         cellStyle += `background-color: #f9fafb; color: #ddd; border-style: dashed; border-color: #ccc;`;
      }
      
      gridHtml += `<div style="${cellStyle}">${cellContent}</div>`;
    });
    gridHtml += `</div>`;
  });
  gridHtml += `</div>`;

  const desk = `<div style="width: ${seatWidth}px; height: ${seatHeight}px; border: 2.5px solid #000; background-color: #dcfce7; display: flex; align-items: center; justify-content: center; font-weight: bold; margin: ${gap}px auto; font-size: ${Math.floor(seatHeight * 0.35)}px; box-shadow: 2px 2px 0 #000;">講桌</div>`;

  // Process Lists: Include padded numbers
  const officerMap: Record<string, string[]> = {};
  const teacherMap: Record<string, string[]> = {};

  data.students.forEach((s, idx) => {
      const titles = data.studentTitles[s] || [];
      const seatNum = (idx + 1).toString().padStart(2, '0');
      const cleanName = formatStudentName(s);
      const entry = `${seatNum}.${cleanName}`;
      
      titles.forEach(t => {
          if (t.includes('小老師')) {
             const subject = t.replace('小老師', '');
             if (!teacherMap[subject]) teacherMap[subject] = [];
             teacherMap[subject].push(entry);
          } else {
             if (!officerMap[t]) officerMap[t] = [];
             officerMap[t].push(entry);
          }
      });
  });

  const renderSection = (title: string, map: Record<string, string[]>, width: string) => {
    let html = `<div style="width: ${width}; box-sizing: border-box; padding: 0 8px; border-right: 1.5px solid #000;">
      <h3 style="text-align: center; border-bottom: 2.5px solid #000; margin: 0 0 10px 0; font-size: 18px; padding-bottom: 5px; font-weight: bold;">${title}</h3>
      <div style="font-size: 16px; line-height: 1.4;">`;
    const entries = Object.entries(map);
    if (entries.length === 0) {
        html += `<div style="color: #999; text-align: center; font-style: italic;">尚未設定</div>`;
    } else {
        entries.forEach(([role, entryList]) => {
            html += `<div style="margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>${role}</strong>: ${entryList.join(', ')}</div>`;
        });
    }
    html += `</div></div>`;
    return html;
  };

  // Student List: Ordered by seat number, padded, now 4 columns
  const studentList = data.students.map((s, index) => ({ 
    name: formatStudentName(s), 
    num: (index + 1).toString().padStart(2, '0')
  }));
  
  const numRowsForList = Math.ceil(studentList.length / 4);
  
  let studentColsHtml = `<div style="width: 44.44%; box-sizing: border-box; padding: 0 10px;">
    <h3 style="text-align: center; border-bottom: 2.5px solid #000; margin: 0 0 10px 0; font-size: 18px; padding-bottom: 5px; font-weight: bold;">學生名單</h3>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; font-size: 15px;">`;
  
  for (let r = 0; r < numRowsForList; r++) {
      for (let c = 0; c < 4; c++) {
          const index = c * numRowsForList + r;
          const studentInfo = studentList[index];
          const text = studentInfo ? `${studentInfo.num}.${studentInfo.name}` : '';
          studentColsHtml += `<div style="border-bottom: 1px solid #eee; text-align: left; padding: 3px; min-height: 1.5em; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-weight: 500;">${text}</div>`;
      }
  }
  studentColsHtml += `</div></div>`;

  return `
    <style>
      @media print {
        @page { size: A4; margin: 0.5cm; }
        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
      }
      body { font-family: 'Noto Sans TC', 'Microsoft JhengHei', sans-serif; }
    </style>
    <div style="width: 200mm; height: 287mm; color: black; display: flex; flex-direction: column; box-sizing: border-box; background: white; margin: 0 auto; overflow: hidden;">
        <!-- Seating Chart Section (3/5 Height = 60%) -->
        <div style="height: 60%; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 3px dashed #000; padding-bottom: 10px; box-sizing: border-box;">
            <h1 style="text-align: center; margin: 0 0 15px 0; font-size: 28px; letter-spacing: 3px; font-weight: bold;">${title}</h1>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 0; width: 100%;">
                ${isTeacherView ? '' : desk}
                ${gridHtml}
                ${isTeacherView ? desk : ''}
            </div>
        </div>
        
        <!-- Lists Section (2/5 Height = 40%) -->
        <!-- Proportions: 2/9 (22.22%), 3/9 (33.33%), 4/9 (44.44%) -->
        <div style="height: 40%; display: flex; padding-top: 20px; box-sizing: border-box; width: 100%;">
            ${renderSection('班級幹部', officerMap, '22.22%')}
            ${renderSection('學科小老師', teacherMap, '33.33%')}
            ${studentColsHtml}
        </div>
    </div>
  `;
};