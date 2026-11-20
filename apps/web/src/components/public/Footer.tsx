import React from 'react';
import { Stethoscope, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-14 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base">Clínica Dental Eugenia</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Odontología médica avanzada, ética y familiar. Registro sanitario oficial de la Comunidad de Madrid.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">Especialidades</h4>
            <ul className="space-y-1.5">
              <li><a href="#tratamientos" className="hover:text-white transition">Implantes y Cirugía Oral</a></li>
              <li><a href="#tratamientos" className="hover:text-white transition">Ortodoncia Invisible</a></li>
              <li><a href="#tratamientos" className="hover:text-white transition">Odontopediatría</a></li>
              <li><a href="#tratamientos" className="hover:text-white transition">Estética y Blanqueamiento</a></li>
              <li><a href="#tratamientos" className="hover:text-white transition">Endodoncia Microscópica</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">Navegación</h4>
            <ul className="space-y-1.5">
              <li><a href="#inicio" className="hover:text-white transition">Inicio</a></li>
              <li><a href="#equipo" className="hover:text-white transition">Equipo Médico</a></li>
              <li><a href="#horarios" className="hover:text-white transition">Horarios de Atención</a></li>
              <li><a href="#contacto" className="hover:text-white transition">Contacto y Ubicación</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">Marco Legal y RGPD</h4>
            <ul className="space-y-1.5">
              <li><a href="#rgpd" className="hover:text-white transition">Aviso Legal</a></li>
              <li><a href="#rgpd" className="hover:text-white transition">Política de Privacidad</a></li>
              <li><a href="#rgpd" className="hover:text-white transition">Política de Cookies</a></li>
              <li><a href="#rgpd" className="hover:text-white transition">Derechos ARCO (RGPD)</a></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© {new Date().getFullYear()} Clínica Dental Eugenia S.L.P. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Diseñado con <Heart className="w-3.5 h-3.5 text-red-400" /> para la salud de tu sonrisa
          </p>
        </div>
      </div>
    </footer>
  );
};

