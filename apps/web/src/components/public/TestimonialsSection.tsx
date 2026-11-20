import React from 'react';
import { Star, Quote } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      name: 'Carmen Martínez',
      treatment: 'Ortodoncia Invisible',
      rating: 5,
      comment: 'El trato de la Dra. Eugenia y el Dr. Carlos ha sido insuperable. Llevaba años acomplejada con mi sonrisa y con los alineadores no se nota nada y los resultados son espectaculares.',
      date: 'Hace 2 semanas',
    },
    {
      name: 'Javier Domínguez',
      treatment: 'Implante Dental y Corona',
      rating: 5,
      comment: 'Tenía pánico al dentista por malas experiencias pasadas. En Clínica Eugenia la intervención fue completamente indolora y el seguimiento por WhatsApp fue constante.',
      date: 'Hace 1 mes',
    },
    {
      name: 'Beatriz Salazar',
      treatment: 'Odontopediatría (Atención Infantil)',
      rating: 5,
      comment: 'La Dra. Sofía tiene una paciencia infinita con los niños. Mi hijo de 6 años fue feliz a su revisión y ya no tiene miedo al sillón dental. ¡Recomendadísimos!',
      date: 'Hace 3 semanas',
    },
  ];

  return (
    <section id="testimonios" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold text-brand-600 tracking-wider uppercase bg-brand-50 border border-brand-100 px-3.5 py-1.5 rounded-full inline-block">
            Opiniones Reales
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            La confianza de nuestros pacientes
          </h2>
          <p className="text-base text-slate-600">
            Descubre por qué cientos de familias en Madrid nos eligen para el cuidado integral de su salud bucodental.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-slate-50 border border-slate-200/80 rounded-3xl p-7 flex flex-col justify-between relative shadow-sm hover:shadow-md transition"
            >
              <Quote className="w-8 h-8 text-brand-200 absolute top-6 right-6 pointer-events-none" />

              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(t.rating)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>

                <p className="text-sm text-slate-700 leading-relaxed italic mb-6">
                  "{t.comment}"
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-slate-900">{t.name}</h4>
                  <span className="text-brand-700 font-semibold">{t.treatment}</span>
                </div>
                <span className="text-slate-400">{t.date}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

