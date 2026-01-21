"use client";

import { useRouter } from 'next-intl/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Shield, UserCog } from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { useRole } from '@/context/RoleContext';

export function RoleSelector() {
  const router = useRouter();
  const { setRole, setAvailableRoles } = useRole();


  const handleLogin = (role: UserRole, availableRoles: UserRole[]) => {
    setRole(role);
    setAvailableRoles(availableRoles);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Welcome to Ndara Afrique</CardTitle>
          <CardDescription className="pt-2">Select a role to explore the application</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4">
          <Button
            size="lg"
            className="w-full"
            onClick={() => handleLogin('student', ['student'])}
          >
            <User className="mr-2 h-5 w-5" /> Login as Student
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => handleLogin('instructor', ['instructor'])}
          >
            <Shield className="mr-2 h-5 w-5" /> Login as Instructor
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => handleLogin('student', ['student', 'instructor'])}
          >
            <UserCog className="mr-2 h-5 w-5" /> Login as Student & Instructor
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
