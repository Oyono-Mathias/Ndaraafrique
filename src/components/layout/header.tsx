
'use client';

import { Bell, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LanguageSelector } from './language-selector';
import { UserNav } from './user-nav';

export function Header() {
    return (
        <div className="flex items-center gap-4 w-full">
            <div className="w-full flex-1">
                {/* Search can be added back here if needed */}
            </div>
            <LanguageSelector />
            <UserNav />
        </div>
    );
}
