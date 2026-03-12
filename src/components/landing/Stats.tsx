'use client';

export function Stats() {
    return (
        <section className="bg-ndara-dark py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:divide-x divide-gray-700">
                    <div className="space-y-1">
                        <p className="text-4xl font-heading font-bold text-white">50k+</p>
                        <p className="text-gray-400 text-sm uppercase tracking-widest font-medium">Étudiants Actifs</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-4xl font-heading font-bold text-white">1,200+</p>
                        <p className="text-gray-400 text-sm uppercase tracking-widest font-medium">Cours en Ligne</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-4xl font-heading font-bold text-white">54</p>
                        <p className="text-gray-400 text-sm uppercase tracking-widest font-medium">Pays Africains</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-4xl font-heading font-bold text-white">4.8/5</p>
                        <p className="text-gray-400 text-sm uppercase tracking-widest font-medium">Note Moyenne</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
