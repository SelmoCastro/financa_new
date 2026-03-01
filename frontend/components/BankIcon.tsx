import React, { useEffect } from 'react';

const bankData = [
    { keywords: ['nubank', 'nu bank'], color: '#8A05BE', text: '#FFFFFF', render: () => <span className="text-xl font-medium tracking-tighter">nu</span> },
    { keywords: ['caixa', 'cef'], color: '#0364B8', text: '#FFFFFF', render: () => <span className="text-[18px] font-black tracking-tighter text-white">C<span className="text-[#F39200]">X</span></span> },
    { keywords: ['banco do brasil', 'bb'], color: '#F8D117', text: '#0038A8', render: () => <span className="text-xl font-black tracking-tighter">bb</span> },
    { keywords: ['itau', 'itaú'], color: '#EC7000', text: '#ffffff', render: () => <span className="text-[13px] font-black tracking-wide">Itaú</span> },
    { keywords: ['santander'], color: '#CC0000', text: '#FFFFFF', render: () => <span className="text-lg font-bold">S</span> },
    { keywords: ['bradesco'], color: '#CC092F', text: '#FFFFFF', render: () => <span className="text-[11px] font-bold">BR</span> },
    { keywords: ['inter', 'banco inter'], color: '#FF7A00', text: '#FFFFFF', render: () => <span className="text-[12px] font-black tracking-tighter">inter</span> },
    { keywords: ['c6', 'c6 bank'], color: '#242424', text: '#FFFFFF', render: () => <span className="text-sm font-black">C6</span> },
    { keywords: ['picpay'], color: '#11C76F', text: '#FFFFFF', render: () => <span className="text-xl font-black">P</span> },
    { keywords: ['mercado pago'], color: '#009EE3', text: '#FFFFFF', render: () => <span className="text-sm font-black">mp</span> },
    { keywords: ['xp', 'xp investimentos'], color: '#000000', text: '#FAD128', render: () => <span className="text-xl font-black">xp</span> },
    { keywords: ['btg'], color: '#002B49', text: '#FFFFFF', render: () => <span className="text-sm font-bold tracking-tight">BTG</span> },
    { keywords: ['nucoin', 'cripto', 'bitcoin', 'binance'], color: '#F7931A', text: '#FFFFFF', render: () => <span className="text-xl font-black">₿</span> },
];

interface BankIconProps {
    name: string;
    type?: string;
    className?: string; // Permitir override das classes base
}

export const BankIcon: React.FC<BankIconProps> = ({ name, type = 'CHECKING', className = "w-12 h-12 rounded-2xl" }) => {
    const normalizedName = name.toLowerCase();
    const bank = bankData.find(b => b.keywords.some(k => normalizedName.includes(k)));

    useEffect(() => {
        // Recarrega ícones padrão se cairmos no fallback
        if (!bank) {
            //@ts-ignore
            if (window.lucide) window.lucide.createIcons();
        }
    }, [bank, type]);

    if (bank) {
        return (
            <div
                className={`${className} flex items-center justify-center shadow-inner overflow-hidden flex-shrink-0 select-none`}
                style={{ backgroundColor: bank.color, color: bank.text }}
            >
                {bank.render()}
            </div>
        );
    }

    // Fallbacks por tipo
    const defaultIcon = type === 'WALLET' ? 'banknote' : type === 'SAVINGS' ? 'piggy-bank' : 'landmark';

    return (
        <div className={`${className} bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 flex-shrink-0 select-none`}>
            <i data-lucide={defaultIcon} className="w-5 h-5"></i>
        </div>
    );
};
