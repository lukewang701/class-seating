import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, ClassData, SavedData } from './types';
import { Button, Modal, InstructionsModal } from './components/UI';
import { Seat } from './components/Seat';
import { getExportFileName, generatePrintContent, formatStudentName } from './utils';
import { Download, Upload, Printer, ArrowLeft, HelpCircle, RotateCw, PlusCircle, Trash2, Shuffle } from 'lucide-react';

const DEFAULT_OFFICER_TAGS = ['班長', '副班', '學藝', '副學', '衛生', '環保', '資源', '風紀', '總務', '輔導', '設備', '安全', '體育', '圖書'];
const DEFAULT_TEACHER_TAGS = ['國文', '英文', '數學', '歷史', '地理', '公民', '物理', '化學', '生物', '地科', '音樂', '美術', '家政', '國防'];

const App: React.FC = () => {
  // --- State ---
  const [currentPage, setCurrentPage] = useState<Page>('settings');
  const [data, setData] = useState<ClassData>({
    name: '',
    teacherName: '',
    rows: 6,
    cols: 6,
    students: [],
    seatingArrangement: {},
    lockedSeats: new Set(),
    studentTitles: {},
    officerTags: [...DEFAULT_OFFICER_TAGS],
    teacherTags: [...DEFAULT_TEACHER_TAGS],
    officerTagsUsage: {},
    teacherTagsUsage: {},
    customOfficerTags: [],
    customTeacherTags: [],
  });
  
  const [studentInputRaw, setStudentInputRaw] = useState('');
  const [newCustomTag, setNewCustomTag] = useState('');
  const [customTagType, setCustomTagType] = useState<'officer' | 'teacher'>('officer');
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedStudentForTitle, setSelectedStudentForTitle] = useState<string | null>(null);
  const [selectedTitleTag, setSelectedTitleTag] = useState<{name: string, type: 'officer' | 'teacher'} | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  
  const [showInstructions, setShowInstructions] = useState(false);
  const [modalState, setModalState] = useState<{
      isOpen: boolean;
      type: 'default' | 'danger' | 'success' | 'warning';
      title: string;
      message: string;
      onConfirm?: () => void;
      showCancel?: boolean;
  }>({ isOpen: false, type: 'default', title: '', message: '' });

  // --- Effects ---
  useEffect(() => {
    if (data.students.length > 0 && !studentInputRaw) {
        setStudentInputRaw(data.students.join('\n'));
    }
  }, [data.students]);

  useEffect(() => {
    if (currentPage === 'students' && !studentInputRaw && data.students.length === 0) {
        const total = data.rows * data.cols;
        const placeholders = Array.from({length: total}, (_, i) => {
            const num = (i + 1).toString().padStart(2, '0');
            if (i === 0) return `${num} 王小明`;
            if (i === 1) return `${num} 林大衛`;
            return num;
        });
        setStudentInputRaw(placeholders.join('\n'));
    }
  }, [currentPage, data.rows, data.cols, studentInputRaw, data.students.length]);

  useEffect(() => {
     if (!previewRef.current) return;
     const observer = new ResizeObserver(entries => {
         for (let entry of entries) {
             setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
         }
     });
     observer.observe(previewRef.current);
     return () => observer.disconnect();
  }, [currentPage]);

  // --- Helpers ---
  const showModal = (title: string, message: string, type: 'default' | 'danger' | 'success' | 'warning' = 'default', onConfirm?: () => void, showCancel = false) => {
      setModalState({ isOpen: true, title, message, type, onConfirm, showCancel });
  };
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));
  const confirmAction = () => {
      if (modalState.onConfirm) modalState.onConfirm();
      closeModal();
  };

  const calculateTotalSeats = () => data.rows * data.cols;

  // --- Actions ---
  const handleSettingsChange = (field: keyof ClassData, value: any) => {
      setData(prev => ({ ...prev, [field]: value }));
  };

  const processStudentList = () => {
      const lines = studentInputRaw.split('\n').map(s => s.trim()).filter(s => s);
      const students = lines.map(line => {
          const match = line.match(/^([^()]+)/);
          return match ? match[1].trim() : line;
      });
      const maxSeats = calculateTotalSeats();
      if (students.length > maxSeats) {
          showModal('警告', `學生人數 (${students.length}) 超過座位數量 (${maxSeats})！`, 'warning');
          return false;
      }
      setData(prev => ({ ...prev, students }));
      return true;
  };

  const toggleTitle = (student: string, tag: string, type: 'officer' | 'teacher') => {
      const fullTag = type === 'teacher' ? tag + '小老師' : tag;
      setData(prev => {
          const currentTitles = prev.studentTitles[student] || [];
          let newTitles = [...currentTitles];
          let newOfficerUsage = { ...prev.officerTagsUsage };
          let newTeacherUsage = { ...prev.teacherTagsUsage };

          if (currentTitles.includes(fullTag)) {
              newTitles = newTitles.filter(t => t !== fullTag);
              if (type === 'officer') newOfficerUsage[tag] = Math.max(0, (newOfficerUsage[tag] || 1) - 1);
              else newTeacherUsage[tag] = Math.max(0, (newTeacherUsage[tag] || 1) - 1);
          } else {
              newTitles.push(fullTag);
              if (type === 'officer') newOfficerUsage[tag] = (newOfficerUsage[tag] || 0) + 1;
              else newTeacherUsage[tag] = (newTeacherUsage[tag] || 0) + 1;
          }
          return { ...prev, studentTitles: { ...prev.studentTitles, [student]: newTitles }, officerTagsUsage: newOfficerUsage, teacherTagsUsage: newTeacherUsage };
      });
  };

  const handleTitleClickFromPool = (tag: string, type: 'officer' | 'teacher') => {
      if (selectedStudentForTitle) {
          toggleTitle(selectedStudentForTitle, tag, type);
          setSelectedStudentForTitle(null);
      } else {
          setSelectedTitleTag(selectedTitleTag?.name === tag && selectedTitleTag?.type === type ? null : { name: tag, type });
      }
  };

  const handleStudentTitleClick = (student: string) => {
    if (selectedTitleTag) {
      toggleTitle(student, selectedTitleTag.name, selectedTitleTag.type);
      setSelectedTitleTag(null);
    } else {
      setSelectedStudentForTitle(student === selectedStudentForTitle ? null : student);
    }
  };

  const handleRemoveTitleFromStudent = (student: string, tagLabel: string) => {
      const isTeacher = tagLabel.endsWith('小老師');
      const baseTag = isTeacher ? tagLabel.replace('小老師', '') : tagLabel;
      const type = isTeacher ? 'teacher' : 'officer';
      toggleTitle(student, baseTag, type);
  };

  const addCustomTag = () => {
      if (!newCustomTag.trim()) return;
      setData(prev => ({
          ...prev,
          customOfficerTags: customTagType === 'officer' ? [...prev.customOfficerTags, newCustomTag] : prev.customOfficerTags,
          customTeacherTags: customTagType === 'teacher' ? [...prev.customTeacherTags, newCustomTag] : prev.customTeacherTags,
          officerTags: customTagType === 'officer' ? [...prev.officerTags, newCustomTag] : prev.officerTags,
          teacherTags: customTagType === 'teacher' ? [...prev.teacherTags, newCustomTag] : prev.teacherTags,
      }));
      setNewCustomTag('');
  };

  const deleteCustomTag = (tag: string, type: 'officer' | 'teacher') => {
      setData(prev => {
          const fullTag = type === 'teacher' ? tag + '小老師' : tag;
          const newStudentTitles = { ...prev.studentTitles };
          Object.keys(newStudentTitles).forEach(student => {
              newStudentTitles[student] = newStudentTitles[student].filter(t => t !== fullTag);
          });
          return {
              ...prev,
              studentTitles: newStudentTitles,
              customOfficerTags: prev.customOfficerTags.filter(t => t !== tag),
              customTeacherTags: prev.customTeacherTags.filter(t => t !== tag),
              officerTags: prev.officerTags.filter(t => t !== tag),
              teacherTags: prev.teacherTags.filter(t => t !== tag),
          };
      });
  };

  const handleSeatClick = (seatId: string) => {
      if (data.lockedSeats.has(seatId)) return;
      if (data.seatingArrangement[seatId]) {
          if (selectedStudent) {
               const prevSeat = Object.keys(data.seatingArrangement).find(k => data.seatingArrangement[k] === selectedStudent);
               if (prevSeat) {
                   const targetStudent = data.seatingArrangement[seatId];
                   setData(prev => ({
                       ...prev,
                       seatingArrangement: { ...prev.seatingArrangement, [prevSeat]: targetStudent, [seatId]: selectedStudent }
                   }));
               } else {
                   setData(prev => ({ ...prev, seatingArrangement: { ...prev.seatingArrangement, [seatId]: selectedStudent } }));
               }
               setSelectedStudent(null);
               setSelectedSeat(null);
               return;
          }
          if (selectedSeat === seatId) { setSelectedSeat(null); setSelectedStudent(null); }
          else { setSelectedSeat(seatId); setSelectedStudent(data.seatingArrangement[seatId]); }
          return;
      }
      if (selectedStudent) {
           const prevSeat = Object.keys(data.seatingArrangement).find(k => data.seatingArrangement[k] === selectedStudent);
           setData(prev => {
               const newState = { ...prev.seatingArrangement };
               if (prevSeat) delete newState[prevSeat];
               newState[seatId] = selectedStudent;
               return { ...prev, seatingArrangement: newState };
           });
           setSelectedStudent(null);
           setSelectedSeat(null);
      } else {
          setSelectedSeat(seatId === selectedSeat ? null : seatId);
      }
  };

  const handleSeatDoubleClick = (seatId: string) => {
      if (data.seatingArrangement[seatId]) {
          // Remove student from seat back to waiting pool
          setData(prev => {
              const newState = { ...prev.seatingArrangement };
              delete newState[seatId];
              return { ...prev, seatingArrangement: newState };
          });
      } else {
          // Toggle Lock status
          setData(prev => {
              const newLocked = new Set(prev.lockedSeats);
              if (newLocked.has(seatId)) {
                  newLocked.delete(seatId);
              } else {
                  // Check if locking this seat makes it impossible to seat all students
                  const totalSeats = prev.rows * prev.cols;
                  const totalStudents = prev.students.length;
                  const currentLocked = newLocked.size;
                  
                  if (totalSeats - (currentLocked + 1) < totalStudents) {
                      showModal('無法鎖定', `如果鎖定此座位，剩下的空位將不足以安排所有學生 (${totalStudents} 位學生)。`, 'warning');
                      return prev;
                  }
                  newLocked.add(seatId);
              }
              return { ...prev, lockedSeats: newLocked };
          });
      }
  };

  const handleRandomAssign = () => {
      const waitingPool = data.students.filter(s => !Object.values(data.seatingArrangement).includes(s));
      
      if (waitingPool.length > 0) {
          const emptyUnlockedSeats: string[] = [];
          for (let r = 1; r <= data.rows; r++) {
              for (let c = 1; c <= data.cols; c++) {
                  const id = `${r}-${c}`;
                  if (!data.lockedSeats.has(id) && !data.seatingArrangement[id]) {
                      emptyUnlockedSeats.push(id);
                  }
              }
          }
          
          const shuffledStudents = [...waitingPool].sort(() => Math.random() - 0.5);
          const shuffledSeats = [...emptyUnlockedSeats].sort(() => Math.random() - 0.5);
          
          setData(prev => {
              const newArrangement = { ...prev.seatingArrangement };
              const count = Math.min(shuffledStudents.length, shuffledSeats.length);
              for (let i = 0; i < count; i++) {
                  newArrangement[shuffledSeats[i]] = shuffledStudents[i];
              }
              return { ...prev, seatingArrangement: newArrangement };
          });
      } else {
          const unLockedSeats: string[] = [];
          for (let r = 1; r <= data.rows; r++) {
              for (let c = 1; c <= data.cols; c++) {
                  const id = `${r}-${c}`;
                  if (!data.lockedSeats.has(id)) unLockedSeats.push(id);
              }
          }
          const shuffledStudents = [...data.students].sort(() => Math.random() - 0.5);
          const shuffledSeats = [...unLockedSeats].sort(() => Math.random() - 0.5);
          
          const newAssignments: Record<string, string> = {};
          const count = Math.min(shuffledStudents.length, shuffledSeats.length);
          for (let i = 0; i < count; i++) {
              newAssignments[shuffledSeats[i]] = shuffledStudents[i];
          }
          setData(prev => ({ ...prev, seatingArrangement: newAssignments }));
      }
  };

  const clearSeats = () => {
    setData(prev => ({ ...prev, seatingArrangement: {} }));
  };

  const calculateGridMetrics = useCallback(() => {
      const { width: W, height: H } = containerSize;
      if (W === 0 || H === 0) return { seatW: 90, seatH: 60, fontSize: 12, deskW: 90, deskH: 60, gap: 8 };
      
      const padding = 16;
      const gap = Math.max(4, Math.min(10, Math.floor(W / 80)));
      
      const availW = W - padding * 2;
      const availH = H - padding * 2;
      
      const effectiveRows = data.rows + 1;
      const effectiveCols = data.cols;
      
      const seatH_byW = (availW - (effectiveCols - 1) * gap) / (1.5 * effectiveCols);
      const seatH_byH = (availH - (effectiveRows - 1) * gap) / effectiveRows;
      
      const seatH = Math.floor(Math.min(seatH_byW, seatH_byH));
      const seatW = Math.floor(seatH * 1.5);
      
      const fontSize = Math.max(12, Math.min(24, Math.floor(seatH * 0.45)));
      
      return { seatW, seatH, fontSize, deskW: seatW, deskH: seatH, gap };
  }, [containerSize, data.rows, data.cols]);

  const gridMetrics = calculateGridMetrics();

  const handleSave = () => {
      const savedData: SavedData = {
          version: '1.0',
          timestamp: new Date().toISOString(),
          classData: { ...data, lockedSeats: Array.from(data.lockedSeats) },
          currentPage
      };
      const blob = new Blob([JSON.stringify(savedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getExportFileName(data.name);
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const parsed = JSON.parse(ev.target?.result as string) as SavedData;
              if (parsed.classData) {
                  setData({
                      ...parsed.classData,
                      lockedSeats: new Set(parsed.classData.lockedSeats || []),
                      customOfficerTags: parsed.classData.customOfficerTags || [],
                      customTeacherTags: parsed.classData.customTeacherTags || [],
                      officerTagsUsage: parsed.classData.officerTagsUsage || {},
                      teacherTagsUsage: parsed.classData.teacherTagsUsage || {},
                  });
                  setCurrentPage(parsed.currentPage || 'settings');
              }
          } catch (err) { showModal('錯誤', '檔案格式錯誤！', 'danger'); }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const handlePrint = () => {
      const printHtml = generatePrintContent(data, currentPage === 'teacherView');
      const win = window.open('', '_blank', 'width=1000,height=1300');
      if (win) {
          win.document.write(`<!DOCTYPE html><html><head><title>列印座位表</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap'); body{margin:0;padding:0;}</style></head><body>${printHtml}<script>window.onload=function(){window.print();}</script></body></html>`);
          win.document.close();
      }
  };

  const waitingPool = data.students.filter(s => !Object.values(data.seatingArrangement).includes(s));
  const waitingHalf = Math.ceil(waitingPool.length / 2);
  const waitingCol1 = waitingPool.slice(0, waitingHalf);
  const waitingCol2 = waitingPool.slice(waitingHalf);

  const renderWaitingStudent = (student: string) => {
      const originalIdx = data.students.indexOf(student);
      const seatNum = (originalIdx + 1).toString().padStart(2, '0');
      const isSelected = selectedStudent === student;
      return (
        <div 
          key={student} 
          onClick={() => { setSelectedStudent(isSelected ? null : student); setSelectedSeat(null); }} 
          className={`p-2 rounded text-center cursor-pointer font-bold border-2 transition-all ${isSelected ? 'bg-amber-400 border-amber-500 text-white shadow-md scale-105' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
        >
          {seatNum} {formatStudentName(student)}
        </div>
      );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden text-gray-800">
      <header className="bg-white shadow-md p-4 flex justify-between items-center z-10 shrink-0">
         <div className="w-10">
             {currentPage !== 'settings' && <button onClick={() => setCurrentPage('settings')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><ArrowLeft /></button>}
         </div>
         <h1 className="text-xl md:text-2xl font-bold truncate text-center flex-1">
             {data.name || '班級座位安排系統'}
             {currentPage === 'students' && ' - 學生名單'}
             {currentPage === 'roles' && ' - 職稱設定'}
             {currentPage === 'seating' && ' - 座位表 (學生)'}
             {currentPage === 'teacherView' && ' - 座位表 (導師)'}
         </h1>
         <div className="w-10 flex justify-end">
             <button onClick={() => setShowInstructions(true)} className="p-2 hover:bg-gray-100 rounded-full text-blue-600"><HelpCircle /></button>
         </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6 w-full max-w-7xl mx-auto flex flex-col">
        {currentPage === 'settings' && (
            <div className="flex flex-col md:flex-row gap-6 h-full">
                <div className="w-full md:w-5/12 bg-white p-6 rounded-2xl shadow-sm flex flex-col overflow-y-auto">
                    <h2 className="text-2xl font-bold mb-6 text-gray-700 border-b pb-2">基本設定</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">班級名稱</label>
                                <input type="text" value={data.name} onChange={e => handleSettingsChange('name', e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">導師姓名</label>
                                <input type="text" value={data.teacherName} onChange={e => handleSettingsChange('teacherName', e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">行數</label>
                                <input type="number" min="1" max="15" value={data.rows} onChange={e => handleSettingsChange('rows', parseInt(e.target.value) || 0)} className="w-full p-3 text-center bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">列數</label>
                                <input type="number" min="1" max="15" value={data.cols} onChange={e => handleSettingsChange('cols', parseInt(e.target.value) || 0)} className="w-full p-3 text-center bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">總座位</label>
                                <div className="w-full p-3 text-center bg-gray-100 text-gray-500 border border-transparent rounded-lg font-bold">{data.rows * data.cols}</div>
                            </div>
                        </div>
                        <Button onClick={() => setCurrentPage('students')} className="w-full mt-6">下一步：輸入名單</Button>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                           <Button onClick={handleSave} variant="warning" className="text-base py-2 text-center flex items-center justify-center"><Download className="inline w-4 h-4 mr-2"/>匯出</Button>
                           <label className="cursor-pointer">
                                <div className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-xl text-lg shadow-md transition-all text-center flex items-center justify-center h-full"><Upload className="inline w-4 h-4 mr-2"/>匯入</div>
                                <input type="file" accept=".json" onChange={handleLoad} className="hidden" />
                           </label>
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-7/12 bg-white p-6 rounded-2xl shadow-sm flex flex-col min-h-[400px]">
                    <h3 className="text-xl font-bold mb-4 text-gray-600 text-center">座位預覽</h3>
                    <div ref={previewRef} className="flex-1 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden p-4 relative">
                        <div className="bg-green-200 border-2 border-gray-600 rounded-lg flex items-center justify-center font-bold text-gray-800 shadow-sm shrink-0" style={{ width: gridMetrics.deskW, height: gridMetrics.deskH, marginBottom: `${gridMetrics.gap}px` }}>講桌</div>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.cols}, 1fr)`, gap: `${gridMetrics.gap}px`, maxWidth: '100%' }}>
                            {Array.from({ length: data.rows * data.cols }).map((_, i) => (
                                <div key={i} className="bg-gray-200 rounded-sm border border-gray-300" style={{ width: gridMetrics.seatW, height: gridMetrics.seatH }}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {currentPage === 'students' && (
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm h-full flex flex-col w-full">
                <h2 className="text-2xl font-bold mb-4 text-center">輸入學生名單</h2>
                <textarea className="flex-1 w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-mono text-lg focus:border-blue-500 outline-none resize-none" value={studentInputRaw} onChange={e => setStudentInputRaw(e.target.value)} />
                <div className="flex gap-4 mt-6 justify-center"><Button variant="secondary" onClick={() => setCurrentPage('settings')}>上一步</Button><Button variant="primary" onClick={() => { if(processStudentList()) setCurrentPage('roles'); }}>下一步：職稱設定</Button></div>
            </div>
        )}

        {currentPage === 'roles' && (
            <div className="flex flex-col md:flex-row gap-6 h-full">
                <div className="w-full md:w-5/12 bg-gray-50 p-4 rounded-xl border-2 border-gray-200 flex flex-col">
                     <h3 className="text-xl font-bold mb-4 text-center">學生名單 (點選配對職稱)</h3>
                     <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 content-start pr-2 custom-scrollbar">
                        {data.students.map((student, index) => {
                            const seatNum = (index + 1).toString().padStart(2, '0');
                            const titles = data.studentTitles[student] || [];
                            const isSelected = selectedStudentForTitle === student;
                            return (
                                <div key={student} onClick={() => handleStudentTitleClick(student)} className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-amber-500 bg-amber-50 shadow-md scale-105' : 'border-white bg-white hover:border-blue-200'}`}>
                                    <div className="font-bold text-lg text-center mb-1">{seatNum} {formatStudentName(student)}</div>
                                    <div className="flex flex-wrap gap-1 justify-center">
                                        {titles.map(t => (
                                            <span key={t} onClick={(e) => { e.stopPropagation(); handleRemoveTitleFromStudent(student, t); }} className={`text-xs px-2 py-0.5 rounded-full text-white cursor-pointer hover:bg-red-500 transition-colors ${t.includes('小老師') ? 'bg-green-600' : 'bg-orange-500'}`}>{t.replace('小老師', '')} ×</span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                </div>
                <div className="w-full md:w-7/12 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-blue-500"/> 自訂新增職稱</h3>
                        <div className="flex gap-2">
                            <select value={customTagType} onChange={e => setCustomTagType(e.target.value as any)} className="bg-gray-50 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition">
                                <option value="officer">班級幹部</option>
                                <option value="teacher">小老師</option>
                            </select>
                            <input type="text" value={newCustomTag} onChange={e => setNewCustomTag(e.target.value)} placeholder="輸入新職稱..." className="flex-1 bg-gray-50 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition" onKeyDown={e => e.key === 'Enter' && addCustomTag()}/>
                            <Button variant="primary" onClick={addCustomTag} className="py-3 px-6">新增</Button>
                        </div>
                    </div>
                    <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                        <h3 className="text-lg font-bold text-orange-800 mb-3">班級幹部 (點選指派)</h3>
                        <div className="flex flex-wrap gap-2">
                            {data.officerTags.map(tag => {
                                const usage = data.officerTagsUsage[tag] || 0;
                                const isSelected = selectedTitleTag?.name === tag && selectedTitleTag.type === 'officer';
                                const isCustom = data.customOfficerTags.includes(tag);
                                return (
                                    <div key={tag} className="flex items-center">
                                        <button onClick={() => handleTitleClickFromPool(tag, 'officer')} className={`px-4 py-2 rounded-lg font-bold transition-all ${usage > 0 ? 'bg-orange-200 text-orange-900 border border-orange-300' : 'bg-white text-orange-700 border border-orange-200'} ${isSelected ? 'ring-4 ring-orange-500 scale-105' : ''}`}>
                                            {tag} {usage > 0 && `(✓)`}
                                        </button>
                                        {isCustom && <button onClick={() => deleteCustomTag(tag, 'officer')} className="ml-1 text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4"/></button>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                        <h3 className="text-lg font-bold text-green-800 mb-3">學科小老師 (點選指派)</h3>
                        <div className="flex flex-wrap gap-2">
                             {data.teacherTags.map(tag => {
                                const usage = data.teacherTagsUsage[tag] || 0;
                                const isSelected = selectedTitleTag?.name === tag && selectedTitleTag.type === 'teacher';
                                const isCustom = data.customTeacherTags.includes(tag);
                                return (
                                    <div key={tag} className="flex items-center">
                                        <button onClick={() => handleTitleClickFromPool(tag, 'teacher')} className={`px-4 py-2 rounded-lg font-bold transition-all ${usage > 0 ? 'bg-green-200 text-green-900 border border-green-300' : 'bg-white text-green-700 border border-green-200'} ${isSelected ? 'ring-4 ring-green-500 scale-105' : ''}`}>
                                            {tag} {usage > 0 && `(${usage}/2)`}
                                        </button>
                                        {isCustom && <button onClick={() => deleteCustomTag(tag, 'teacher')} className="ml-1 text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4"/></button>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="mt-auto flex justify-center gap-4 py-4 border-t"><Button variant="secondary" onClick={() => setCurrentPage('students')}>上一步</Button><Button variant="primary" onClick={() => setCurrentPage('seating')}>完成，前往座位安排</Button></div>
                </div>
            </div>
        )}

        {(currentPage === 'seating' || currentPage === 'teacherView') && (
             <div className="flex flex-col gap-6 h-full">
                 <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
                    <div className="w-full md:w-3/4 bg-white p-5 rounded-2xl shadow-sm flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h2 className="text-xl font-bold text-gray-700">{currentPage === 'seating' ? '學生視角 (面向黑板)' : '導師視角 (面向學生)'}</h2>
                            <button onClick={() => setCurrentPage(prev => prev === 'seating' ? 'teacherView' : 'seating')} className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors font-bold"><RotateCw className="w-5 h-5" /> 切換視角</button>
                        </div>
                        <div ref={previewRef} className="flex-1 bg-gray-100 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-6">
                            {currentPage === 'seating' && <div className="bg-green-200 border-2 border-gray-600 rounded-lg flex items-center justify-center font-bold text-gray-800 shadow-sm shrink-0" style={{ width: gridMetrics.deskW, height: gridMetrics.deskH, marginBottom: `${gridMetrics.gap}px` }}>講桌</div>}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: `${gridMetrics.gap}px` }}>
                                {(currentPage === 'teacherView' ? Array.from({length: data.rows}, (_, i) => data.rows - i) : Array.from({length: data.rows}, (_, i) => i + 1)).map(r => (
                                    <div key={r} style={{ display: 'flex', gap: `${gridMetrics.gap}px` }}>
                                        {(currentPage === 'teacherView' ? Array.from({length: data.cols}, (_, i) => data.cols - i) : Array.from({length: data.rows}, (_, i) => i + 1)).map(c => {
                                            const seatId = `${r}-${c}`;
                                            return <Seat key={seatId} id={seatId} studentName={data.seatingArrangement[seatId]} isLocked={data.lockedSeats.has(seatId)} isSelected={selectedSeat === seatId} width={gridMetrics.seatW} height={gridMetrics.seatH} fontSize={gridMetrics.fontSize} onClick={handleSeatClick} onDoubleClick={handleSeatDoubleClick} />;
                                        })}
                                    </div>
                                ))}
                            </div>
                            {currentPage === 'teacherView' && <div className="bg-green-200 border-2 border-gray-600 rounded-lg flex items-center justify-center font-bold text-gray-800 shadow-sm shrink-0" style={{ width: gridMetrics.deskW, height: gridMetrics.deskH, marginTop: `${gridMetrics.gap}px` }}>講桌</div>}
                        </div>
                    </div>
                    <div className="w-full md:w-1/4 bg-white p-4 rounded-2xl shadow-sm flex flex-col min-h-0 border border-gray-100">
                        <h3 className="text-lg font-bold mb-3 text-center border-b pb-2 flex items-center justify-center gap-2">待安排名單 <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{waitingPool.length}</span></h3>
                        <div className="flex-1 overflow-y-auto flex gap-3 custom-scrollbar pr-1">
                            <div className="flex-1 flex flex-col gap-2">
                                {waitingCol1.map(renderWaitingStudent)}
                            </div>
                            <div className="flex-1 flex flex-col gap-2">
                                {waitingCol2.map(renderWaitingStudent)}
                            </div>
                        </div>
                    </div>
                 </div>
                 <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 flex justify-center gap-4 flex-wrap shrink-0">
                    <Button variant="success" onClick={() => showModal('確認隨機安排', waitingPool.length > 0 ? '將剩餘待安排學生隨機分配到空位中。' : '確定要重新隨機分配所有學生座位嗎？(鎖定的位置不會變動)', 'warning', handleRandomAssign, true)} className="flex-1 max-w-[180px] flex items-center justify-center"><Shuffle className="w-5 h-5 mr-2"/> 隨機安排</Button>
                    <Button variant="danger" onClick={() => showModal('確認重置', '確定要清空所有座位嗎？', 'danger', clearSeats, true)} className="flex-1 max-w-[180px] flex items-center justify-center"><Trash2 className="w-5 h-5 mr-2"/> 全部清空</Button>
                    <Button variant="warning" onClick={handleSave} className="flex-1 max-w-[180px] flex items-center justify-center"><Download className="w-5 h-5 mr-2"/> 匯出資料</Button>
                    <Button variant="primary" onClick={handlePrint} className="flex-1 max-w-[180px] flex items-center justify-center"><Printer className="w-5 h-5 mr-2"/> 列印座位表</Button>
                    <Button variant="secondary" onClick={() => setCurrentPage('roles')} className="flex-1 max-w-[180px] font-bold">上一步</Button>
                 </div>
             </div>
        )}
      </main>
      <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title} type={modalState.type} footer={<>{modalState.showCancel && <Button variant="secondary" onClick={closeModal}>取消</Button>}<Button variant={modalState.type === 'danger' ? 'danger' : 'primary'} onClick={confirmAction}>確定</Button></>}>{modalState.message}</Modal>
      <InstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
    </div>
  );
};

export default App;