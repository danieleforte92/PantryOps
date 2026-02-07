import { useAuth, clearAuth } from '../hooks/useApi';
import { User as UserIcon, LogOut, Moon, Sun, ChevronRight } from 'lucide-react';
import { useState, ReactNode } from 'react';
import { Button } from '../components/ui/Button';

interface SettingItem {
    label: string;
    sublabel: string;
    value?: string;
    onClick?: () => void;
    action?: ReactNode;
}

interface SettingSection {
    title: string;
    icon: ReactNode;
    items: SettingItem[];
}

export default function SettingsPage() {
    const { user, household } = useAuth();
    const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

    const handleLogout = () => {
        clearAuth();
        window.location.href = '/';
    };

    const toggleTheme = () => {
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            document.cookie = "theme=light; path=/";
            setIsDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            document.cookie = "theme=dark; path=/";
            setIsDarkMode(true);
        }
    };

    const sections: SettingSection[] = [
        {
            title: 'Account',
            icon: <UserIcon className="text-secondary" />,
            items: [
                { label: 'Email', value: user?.email || '', sublabel: 'Email associata al profilo' },
            ]
        },
        {
            title: 'Household',
            icon: <UserIcon className="text-primary" />,
            items: [
                { label: 'Nome Nucleo', value: household?.name || 'Mio Nucleo', sublabel: 'Nome della tua dispensa' },
            ]
        },
        {
            title: 'Preferenze',
            icon: <UserIcon className="text-gray-400" />,
            items: [
                {
                    label: 'Tema',
                    sublabel: isDarkMode ? 'Modalita Scura' : 'Modalita Chiara',
                    onClick: toggleTheme,
                    action: isDarkMode ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-yellow-500" />
                }
            ]
        }
    ];

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Impostazioni</h1>
                <p className="text-text-muted">Gestisci il tuo profilo e le preferenze principali</p>
            </div>

            {/* Profile Hero */}
            <div className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-gray-200 dark:border-white/5 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-3xl shadow-inner border-4 border-white dark:border-zinc-800">
                    {user?.name?.slice(0, 2).toUpperCase() || 'ME'}
                </div>
                <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.name || 'Utente'}</h2>
                    <p className="text-text-muted mb-4">{user?.email}</p>
                </div>
                <Button variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnetti
                </Button>
            </div>

            {/* Settings List */}
            <div className="grid grid-cols-1 gap-6">
                {sections.map((section, idx) => (
                    <div key={idx} className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-sm font-bold uppercase tracking-widest text-text-muted">{section.title}</span>
                        </div>
                        <div className="bg-white dark:bg-surface-dark rounded-[2rem] border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm">
                            {section.items.map((item, iIdx) => (
                                <div
                                    key={iIdx}
                                    className={`p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group ${iIdx !== section.items.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''}`}
                                    onClick={item.onClick}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 dark:text-white">{item.label}</span>
                                        <span className="text-xs text-text-muted">{item.sublabel}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {item.value && <span className="text-sm font-medium text-text-muted">{item.value}</span>}
                                        {item.action ? item.action : <ChevronRight size={18} className="text-gray-300 group-hover:text-primary transition-colors" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
