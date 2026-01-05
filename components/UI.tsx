import React from 'react';
import { X, Check, AlertTriangle, RotateCw, Info } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  type?: 'default' | 'danger' | 'success' | 'warning';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, type = 'default' }) => {
  if (!isOpen) return null;

  const colorClasses = {
    default: 'text-gray-800',
    danger: 'text-red-600',
    success: 'text-green-600',
    warning: 'text-orange-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
        <div className="p-6">
          <h3 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${colorClasses[type]}`}>
            {type === 'danger' && <X className="w-8 h-8" />}
            {type === 'success' && <Check className="w-8 h-8" />}
            {type === 'warning' && <AlertTriangle className="w-8 h-8" />}
            {title}
          </h3>
          <div className="text-lg text-gray-700">{children}</div>
        </div>
        {footer && (
          <div className="bg-gray-50 p-4 flex gap-3 justify-end border-t">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'purple' | 'teal' }> = ({ className = '', variant = 'primary', ...props }) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    warning: 'bg-orange-600 hover:bg-orange-700 text-white',
    purple: 'bg-purple-600 hover:bg-purple-700 text-white',
    teal: 'bg-teal-600 hover:bg-teal-700 text-white',
  };

  return (
    <button
      className={`${variants[variant]} font-bold py-3 px-6 rounded-xl text-lg shadow-md transition-all active:scale-95 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
};

export const InstructionsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [isFlipped, setIsFlipped] = React.useState(false);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="操作說明" footer={<Button onClick={onClose} className="w-full">我知道了</Button>}>
            <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-4">
               <div className="flex justify-between items-start mb-4">
                    <p className="text-gray-600">系統功能與操作指南</p>
                    <div className={`flip-card ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                        <div className="flip-card-inner">
                            <div className="flip-card-front text-sm">
                                <div>網頁設計者</div>
                            </div>
                            <div className="flip-card-back text-sm">
                                <div>
                                    <div>松山高中英文科</div>
                                    <div className="mt-1">王信斌 老師</div>
                                </div>
                            </div>
                        </div>
                    </div>
               </div>

               <InstructionItem title="第一頁：基本設定" color="bg-blue-50" titleColor="text-blue-800">
                  <ul className="list-disc pl-5 space-y-1">
                      <li>輸入班級與導師資料。</li>
                      <li>設定座位的行數與列數 (系統會自動計算總座位數)。</li>
                  </ul>
               </InstructionItem>

               <InstructionItem title="第二頁：學生名單" color="bg-gray-50" titleColor="text-gray-800">
                   <ul className="list-disc pl-5 space-y-1">
                       <li>可直接貼上 Excel 或 Word 的名單。</li>
                       <li>每行一位學生。</li>
                   </ul>
               </InstructionItem>

               <InstructionItem title="第三頁：幹部設定" color="bg-orange-50" titleColor="text-orange-800">
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>先點選職稱標籤，再點選學生姓名</strong>。</li>
                        <li>可重複點選多個職稱給同一位學生。</li>
                        <li>可自訂特殊職稱。</li>
                    </ul>
               </InstructionItem>

               <InstructionItem title="第四頁：座位安排" color="bg-purple-50" titleColor="text-purple-800">
                   <ul className="list-disc pl-5 space-y-1">
                       <li><strong>手動安排：</strong>點選右側學生 → 點選左側空位。</li>
                       <li><strong>交換座位：</strong>點選 A 生座位 → 點選 B 生座位。</li>
                       <li><strong>鎖定座位：</strong>雙擊空座位可顯示 <span className="text-red-600 font-bold">✖</span>，該位子不會被分配。</li>
                       <li><strong>移除學生：</strong>雙擊已有人的座位可將學生移回名單。</li>
                   </ul>
               </InstructionItem>
            </div>
        </Modal>
    )
}

const InstructionItem: React.FC<{title: string, color: string, titleColor: string, children: React.ReactNode}> = ({title, color, titleColor, children}) => (
    <div className={`${color} p-4 rounded-lg`}>
        <h4 className={`text-lg font-bold ${titleColor} mb-2`}>{title}</h4>
        <div className="text-gray-700 text-base">{children}</div>
    </div>
);
