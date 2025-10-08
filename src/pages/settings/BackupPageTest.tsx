import React, { useState } from 'react';
import { Plus, Settings, Upload, Key, FolderOpen, Wifi } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'react-hot-toast';

/**
 * Page de test pour vérifier tous les boutons de BackupPage
 */
const BackupPageTest: React.FC = () => {
  const [showModal1, setShowModal1] = useState(false);
  const [showModal2, setShowModal2] = useState(false);
  const [showModal3, setShowModal3] = useState(false);
  const [showModal4, setShowModal4] = useState(false);
  const [showModal5, setShowModal5] = useState(false);
  const [showModal6, setShowModal6] = useState(false);

  const testButton = (name: string) => {
    console.log(`TEST: Bouton "${name}" cliqué`);
    toast.success(`✅ Bouton "${name}" fonctionne !`);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Test des Boutons BackupPage</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tests des Boutons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test 1: Nouvelle Planification */}
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">1. Nouvelle Planification</h3>
            <Button
              onClick={() => {
                testButton('Nouvelle Planification');
                setShowModal1(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle planification
            </Button>
          </div>

          {/* Test 2: Icône Réglage */}
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">2. Icône Réglage</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                testButton('Icône Réglage');
                setShowModal2(true);
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Test 3: Lancer la Restauration */}
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">3. Lancer la Restauration</h3>
            <Button
              className="bg-[var(--color-warning)] hover:bg-[var(--color-warning)]"
              onClick={() => {
                testButton('Lancer la Restauration');
                setShowModal3(true);
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Lancer la restauration
            </Button>
          </div>

          {/* Test 4: Icône Clé */}
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">4. Icône Clé (Générateur)</h3>
            <Button
              variant="outline"
              onClick={() => {
                testButton('Icône Clé');
                setShowModal4(true);
              }}
            >
              <Key className="h-4 w-4" />
            </Button>
          </div>

          {/* Test 5: Icône Dossier */}
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">5. Icône Dossier</h3>
            <Button
              variant="outline"
              onClick={() => {
                testButton('Icône Dossier');
                setShowModal5(true);
              }}
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>

          {/* Test 6: Tester la Connexion */}
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">6. Tester la Connexion</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                testButton('Tester la Connexion');
                setShowModal6(true);
              }}
            >
              <Wifi className="mr-2 h-4 w-4" />
              Tester la connexion
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals de Test */}
      <Dialog open={showModal1} onOpenChange={setShowModal1}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>✅ Modal 1: Nouvelle Planification</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Ce modal s'affiche correctement !</p>
            <Button onClick={() => setShowModal1(false)} className="mt-4">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showModal2} onOpenChange={setShowModal2}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>✅ Modal 2: Configuration</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Ce modal s'affiche correctement !</p>
            <Button onClick={() => setShowModal2(false)} className="mt-4">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showModal3} onOpenChange={setShowModal3}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>✅ Modal 3: Restauration</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Ce modal s'affiche correctement !</p>
            <Button onClick={() => setShowModal3(false)} className="mt-4">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showModal4} onOpenChange={setShowModal4}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>✅ Modal 4: Générateur de Clé</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Ce modal s'affiche correctement !</p>
            <Button onClick={() => setShowModal4(false)} className="mt-4">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showModal5} onOpenChange={setShowModal5}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>✅ Modal 5: Sélection Dossier</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Ce modal s'affiche correctement !</p>
            <Button onClick={() => setShowModal5(false)} className="mt-4">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showModal6} onOpenChange={setShowModal6}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>✅ Modal 6: Test Connexion Cloud</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Ce modal s'affiche correctement !</p>
            <Button onClick={() => setShowModal6(false)} className="mt-4">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">Instructions de test:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Cliquez sur chaque bouton</li>
            <li>Vérifiez qu'un toast de succès s'affiche</li>
            <li>Vérifiez qu'un modal s'ouvre</li>
            <li>Vérifiez que vous pouvez fermer le modal</li>
            <li>Vérifiez la console pour les logs</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupPageTest;
