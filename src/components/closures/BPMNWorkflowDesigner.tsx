import React, { useState, useRef, useEffect } from 'react';
import {
  GitBranch,
  Play,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Plus,
  Settings,
  Save,
  Download,
  Upload,
  Eye,
  Code,
  Layers,
  Timer,
  Users,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface BPMNNode {
  id: string;
  type: 'start' | 'end' | 'task' | 'gateway' | 'event';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, unknown>;
  connections: string[];
}

interface BPMNTemplate {
  id: string;
  name: string;
  description: string;
  closureType: string;
  estimatedDuration: string;
  nodes: BPMNNode[];
  compliance: number;
}

const BPMNWorkflowDesigner: React.FC = () => {
  const [nodes, setNodes] = useState<BPMNNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<BPMNNode | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string>('');
  const canvasRef = useRef<HTMLDivElement>(null);

  // Templates prédéfinis
  const predefinedTemplates: BPMNTemplate[] = [
    {
      id: 'monthly_standard',
      name: 'Clôture Mensuelle Standard',
      description: 'Template SYSCOHADA pour clôture mensuelle automatisée',
      closureType: 'monthly',
      estimatedDuration: '4h 30min',
      compliance: 98.5,
      nodes: [
        {
          id: 'start',
          type: 'start',
          name: 'Début Clôture',
          x: 50,
          y: 100,
          width: 60,
          height: 60,
          properties: { trigger: 'manual' },
          connections: ['balance_pre']
        },
        {
          id: 'balance_pre',
          type: 'task',
          name: 'Balance Pré-Clôture',
          x: 200,
          y: 100,
          width: 120,
          height: 80,
          properties: {
            automatic: true,
            syscohada: true,
            duration: 5,
            reference: 'SYSCOHADA Art. 65'
          },
          connections: ['provisions_gateway']
        },
        {
          id: 'provisions_gateway',
          type: 'gateway',
          name: 'Provisions?',
          x: 400,
          y: 100,
          width: 80,
          height: 80,
          properties: { condition: 'hasProvisions' },
          connections: ['provisions_calc', 'amortissements']
        },
        {
          id: 'provisions_calc',
          type: 'task',
          name: 'Calcul Provisions',
          x: 550,
          y: 50,
          width: 120,
          height: 80,
          properties: {
            automatic: true,
            syscohada: true,
            duration: 8,
            methods: ['statistical', 'individual', 'ml_prediction']
          },
          connections: ['validation']
        },
        {
          id: 'amortissements',
          type: 'task',
          name: 'Amortissements',
          x: 550,
          y: 150,
          width: 120,
          height: 80,
          properties: {
            automatic: true,
            syscohada: true,
            duration: 5,
            reference: 'SYSCOHADA Art. 42'
          },
          connections: ['validation']
        },
        {
          id: 'validation',
          type: 'task',
          name: 'Validation Manager',
          x: 750,
          y: 100,
          width: 120,
          height: 80,
          properties: {
            manual: true,
            approver: 'financial_manager',
            sla: 24
          },
          connections: ['end']
        },
        {
          id: 'end',
          type: 'end',
          name: 'Clôture Terminée',
          x: 950,
          y: 100,
          width: 60,
          height: 60,
          properties: {
            notifications: ['email', 'teams'],
            archive: true
          },
          connections: []
        }
      ]
    },
    {
      id: 'quarterly_consolidation',
      name: 'Consolidation Trimestrielle',
      description: 'Workflow consolidation multi-sociétés avec éliminations',
      closureType: 'quarterly',
      estimatedDuration: '2j 6h',
      compliance: 96.8,
      nodes: []
    },
    {
      id: 'annual_complete',
      name: 'Clôture Annuelle Complète',
      description: 'Workflow complet avec inventaire et audit externe',
      closureType: 'annual',
      estimatedDuration: '7j 12h',
      compliance: 99.2,
      nodes: []
    }
  ];

  const loadTemplate = (templateId: string) => {
    const template = predefinedTemplates.find(t => t.id === templateId);
    if (template) {
      setNodes(template.nodes);
      setActiveTemplate(templateId);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'start':
        return <Play className="h-6 w-6 text-green-600" />;
      case 'end':
        return <Square className="h-6 w-6 text-red-600" />;
      case 'task':
        return <Circle className="h-6 w-6 text-blue-600" />;
      case 'gateway':
        return <Diamond className="h-6 w-6 text-yellow-600" />;
      default:
        return <Circle className="h-6 w-6 text-gray-600" />;
    }
  };

  const renderNode = (node: BPMNNode) => (
    <div
      key={node.id}
      className={`absolute border-2 rounded-lg cursor-pointer transition-all ${
        selectedNode === node.id
          ? 'border-purple-500 bg-purple-50 shadow-lg'
          : 'border-gray-300 bg-white hover:border-blue-400 hover:shadow-md'
      }`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height
      }}
      onClick={() => {
        setSelectedNode(node.id);
        setShowProperties(true);
      }}
    >
      <div className="flex flex-col items-center justify-center h-full p-2">
        {getNodeIcon(node.type)}
        <span className="text-xs font-medium text-center mt-1 leading-tight">
          {node.name}
        </span>

        {/* Badges pour propriétés */}
        <div className="flex flex-wrap gap-1 mt-1">
          {node.properties.automatic && (
            <span className="px-1 py-0.5 bg-green-100 text-green-700 text-xs rounded">Auto</span>
          )}
          {node.properties.syscohada && (
            <span className="px-1 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">SYSCOHADA</span>
          )}
          {node.properties.duration && (
            <span className="px-1 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
              {node.properties.duration}min
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Palette d'outils */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <GitBranch className="h-5 w-5 mr-2 text-purple-600" />
          Designer BPMN 2.0
        </h3>

        {/* Templates prédéfinis */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Templates SYSCOHADA</h4>
          <div className="space-y-2">
            {predefinedTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => loadTemplate(template.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  activeTemplate === template.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                <div className="text-xs text-gray-700 mt-1">{template.description}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-blue-600">{template.estimatedDuration}</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    {template.compliance}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Éléments BPMN */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Éléments BPMN</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { type: 'start', name: 'Début', icon: Play, color: 'text-green-600' },
              { type: 'end', name: 'Fin', icon: Square, color: 'text-red-600' },
              { type: 'task', name: 'Tâche', icon: Circle, color: 'text-blue-600' },
              { type: 'gateway', name: 'Condition', icon: Diamond, color: 'text-yellow-600' }
            ].map((element) => (
              <div
                key={element.type}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer text-center"
                draggable
                onDragStart={() => setDraggedNode({
                  id: `${element.type}_${Date.now()}`,
                  type: element.type as BPMNNode['type'],
                  name: element.name,
                  x: 0,
                  y: 0,
                  width: element.type === 'task' ? 120 : 60,
                  height: element.type === 'task' ? 80 : 60,
                  properties: {},
                  connections: []
                })}
              >
                <element.icon className={`h-6 w-6 mx-auto ${element.color}`} />
                <span className="text-xs font-medium">{element.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2">
            <Save className="h-4 w-4" />
            <span>Sauvegarder</span>
          </button>
          <button className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2">
            <Play className="h-4 w-4" />
            <span>Tester Workflow</span>
          </button>
          <div className="flex space-x-2">
            <button className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-1">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-1">
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
          </div>
        </div>
      </div>

      {/* Canvas de design */}
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 right-4 bg-white rounded-lg border border-gray-200 p-4 shadow-sm z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {activeTemplate ? predefinedTemplates.find(t => t.id === activeTemplate)?.name : 'Nouveau Workflow'}
              </h3>
              {activeTemplate && (
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Timer className="h-4 w-4" />
                    <span>{predefinedTemplates.find(t => t.id === activeTemplate)?.estimatedDuration}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{predefinedTemplates.find(t => t.id === activeTemplate)?.compliance}% SYSCOHADA</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowProperties(!showProperties)}
                className={`p-2 rounded-lg border transition-colors ${
                  showProperties ? 'bg-blue-50 border-blue-300' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Settings className="h-4 w-4" />
              </button>
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50" aria-label="Voir les détails">
                <Eye className="h-4 w-4" />
              </button>
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Code className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Zone de canvas */}
        <div
          ref={canvasRef}
          className="absolute inset-0 mt-20 bg-gray-100 overflow-auto"
          style={{
            backgroundImage: 'radial-gradient(circle, #d4d4d4 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedNode && canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const newNode = {
                ...draggedNode,
                x: e.clientX - rect.left - draggedNode.width / 2,
                y: e.clientY - rect.top - draggedNode.height / 2
              };
              setNodes([...nodes, newNode]);
              setDraggedNode(null);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          {/* Rendu des nœuds */}
          {nodes.map(renderNode)}

          {/* Guide de démarrage */}
          {nodes.length === 0 && !activeTemplate && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white p-8 rounded-lg border border-gray-200 text-center max-w-md">
                <GitBranch className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Designer de Workflow BPMN 2.0
                </h3>
                <p className="text-gray-600 mb-4">
                  Créez vos workflows de clôture personnalisés ou chargez un template SYSCOHADA prédéfini.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => loadTemplate('monthly_standard')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Charger Template Mensuel
                  </button>
                  <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Créer depuis zéro
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panneau de propriétés */}
      {showProperties && selectedNode && (
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Propriétés</h3>
            <button
              onClick={() => setShowProperties(false)}
              className="p-1 text-gray-700 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {(() => {
            const node = nodes.find(n => n.id === selectedNode);
            if (!node) return null;

            return (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'étape
                  </label>
                  <input
                    type="text"
                    value={node.name}
                    onChange={(e) => {
                      setNodes(nodes.map(n =>
                        n.id === selectedNode ? { ...n, name: e.target.value } : n
                      ));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={node.type}
                    onChange={(e) => {
                      setNodes(nodes.map(n =>
                        n.id === selectedNode ? { ...n, type: e.target.value as BPMNNode['type'] } : n
                      ));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="start">Début</option>
                    <option value="end">Fin</option>
                    <option value="task">Tâche</option>
                    <option value="gateway">Condition</option>
                  </select>
                </div>

                {node.type === 'task' && (
                  <>
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Configuration SYSCOHADA</h4>

                      <div className="space-y-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={node.properties.automatic || false}
                            onChange={(e) => {
                              setNodes(nodes.map(n =>
                                n.id === selectedNode
                                  ? { ...n, properties: { ...n.properties, automatic: e.target.checked } }
                                  : n
                              ));
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Exécution automatique</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={node.properties.syscohada || false}
                            onChange={(e) => {
                              setNodes(nodes.map(n =>
                                n.id === selectedNode
                                  ? { ...n, properties: { ...n.properties, syscohada: e.target.checked } }
                                  : n
                              ));
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Contrôle SYSCOHADA requis</span>
                        </label>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Durée estimée (minutes)
                          </label>
                          <input
                            type="number"
                            value={node.properties.duration || ''}
                            onChange={(e) => {
                              setNodes(nodes.map(n =>
                                n.id === selectedNode
                                  ? { ...n, properties: { ...n.properties, duration: parseInt(e.target.value) || 0 } }
                                  : n
                              ));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="5"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Référence SYSCOHADA
                          </label>
                          <input
                            type="text"
                            value={node.properties.reference || ''}
                            onChange={(e) => {
                              setNodes(nodes.map(n =>
                                n.id === selectedNode
                                  ? { ...n, properties: { ...n.properties, reference: e.target.value } }
                                  : n
                              ));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="SYSCOHADA Art. XX"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Automatisation</h4>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Script d'automatisation
                        </label>
                        <textarea
                          value={node.properties.script || ''}
                          onChange={(e) => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode
                                ? { ...n, properties: { ...n.properties, script: e.target.value } }
                                : n
                            ));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          rows={4}
                          placeholder="# Script Python pour automatisation"
                        />
                      </div>
                    </div>
                  </>
                )}

                {node.type === 'gateway' && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Conditions</h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Condition métier
                      </label>
                      <select
                        value={node.properties.condition || ''}
                        onChange={(e) => {
                          setNodes(nodes.map(n =>
                            n.id === selectedNode
                              ? { ...n, properties: { ...n.properties, condition: e.target.value } }
                              : n
                          ));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Sélectionner condition</option>
                        <option value="hasProvisions">A des provisions</option>
                        <option value="isQuarterly">Clôture trimestrielle</option>
                        <option value="amountThreshold">Seuil de montant</option>
                        <option value="approvalRequired">Approbation requise</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Validation</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Connecté:</span>
                      <span className={node.connections.length > 0 ? 'text-green-600' : 'text-red-600'}>
                        {node.connections.length > 0 ? 'Oui' : 'Non'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">SYSCOHADA:</span>
                      <span className={node.properties.syscohada ? 'text-green-600' : 'text-gray-700'}>
                        {node.properties.syscohada ? 'Conforme' : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default BPMNWorkflowDesigner;