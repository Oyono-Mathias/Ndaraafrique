'use client';

export default function EditCoursePage({ params }: { params: { courseId: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Éditer le cours</h1>
      <p className="text-muted-foreground">Vous modifiez le cours avec l'ID : {params.courseId}</p>
      <p className="text-muted-foreground">Cette section est en cours de construction.</p>
    </div>
  );
}
