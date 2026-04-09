import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  LogOut, 
  ChevronRight, 
  Heart, 
  Utensils, 
  Sparkles, 
  Trophy,
  User as UserIcon,
  ArrowLeft,
  Trash2,
  Shield
} from 'lucide-react';
import { AppState, Classroom, Student, Pet, PetType } from './types';
import { PET_TEMPLATES, MAX_STUDENTS_PER_CLASS, PET_ITEMS, DEGRADATION_RATE, TYPE_EFFECTIVENESS } from './constants';
import { loadState, saveState } from './lib/storage';
import { generatePetImage } from './lib/gemini';

const ADMINS = [
  { id: 'Barry', name: 'Barry', password: 'BarryTheBoss' },
  { id: 'Leo', name: 'Leo', password: 'Leo01' }
];

export default function App() {
  const [state, setState] = useState<AppState>(loadState());
  const [view, setView] = useState<'login' | 'classes' | 'class-detail' | 'pet-view' | 'arena' | 'admin'>('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [previewPetType, setPreviewPetType] = useState<PetType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [useAI, setUseAI] = useState(false);
  
  // Battle State
  const [battleResult, setBattleResult] = useState<{ win: boolean; expGained: number; opponent: any } | null>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [battleOpponent, setBattleOpponent] = useState<Student | null>(null);
  const [battleState, setBattleState] = useState<{
    playerHp: number;
    opponentHp: number;
    playerMaxHp: number;
    opponentMaxHp: number;
    playerAtkMod: number;
    playerDefMod: number;
    opponentAtkMod: number;
    opponentDefMod: number;
    turn: 'player' | 'opponent';
    logs: string[];
    isFinished: boolean;
  } | null>(null);

  // Modal State
  const [modal, setModal] = useState<{ 
    type: 'create-class' | 'add-student' | 'confirm-delete' | 'alert' | null,
    title?: string,
    message?: string,
    onConfirm?: () => void
  }>({ type: null });
  const [modalInput, setModalInput] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState<string>('Barry');

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Persistence
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Stat Decay & Mood Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        classrooms: prev.classrooms.map(c => ({
          ...c,
          students: c.students.map(s => {
            if (s.pets.length === 0) return s;
            const now = Date.now();
            
            const updatedPets = s.pets.map(pet => {
              const elapsedMinutes = (now - pet.lastUpdate) / (1000 * 60);
              if (elapsedMinutes < 1) return pet;

              const updatedPet = { ...pet };
              const hungerLoss = elapsedMinutes * DEGRADATION_RATE;
              const cleanLoss = elapsedMinutes * DEGRADATION_RATE;
              
              const moodBaseLoss = elapsedMinutes * DEGRADATION_RATE;
              const moodExtraLoss = ((100 - updatedPet.hunger) + (100 - updatedPet.cleanliness)) / 200 * DEGRADATION_RATE;
              const totalMoodLoss = moodBaseLoss + moodExtraLoss;

              updatedPet.hunger = Math.max(0, updatedPet.hunger - hungerLoss);
              updatedPet.cleanliness = Math.max(0, updatedPet.cleanliness - cleanLoss);
              updatedPet.mood = Math.max(0, updatedPet.mood - totalMoodLoss);
              updatedPet.lastUpdate = now;
              return updatedPet;
            });

            return { ...s, pets: updatedPets };
          })
        }))
      }));
    }, 1000 * 60); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // View Logic
  useEffect(() => {
    if (state.isLoggedIn && view === 'login') {
      setView('classes');
    }
  }, [state.isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const admin = ADMINS.find(a => a.name === username && a.password === password);
    if (admin) {
      setIsAdmin(true);
      setState(prev => ({ ...prev, isLoggedIn: true, currentAdminId: admin.id }));
      setView('admin');
    } else if (username === 'Barry01' && password === 'BarryPass') {
      setIsAdmin(false);
      setState(prev => ({ ...prev, isLoggedIn: true, currentAdminId: undefined }));
      setView('classes');
    } else {
      setLoginError('账号或密码错误');
    }
  };

  const handleDeleteStudent = (classId: string, studentId: string) => {
    setModal({
      type: 'confirm-delete',
      title: '删除学生',
      message: '确定要删除该学生吗？此操作不可恢复。',
      onConfirm: () => {
        setState(prev => {
          const newClassrooms = prev.classrooms.map(cls => {
            if (cls.id === classId) {
              return {
                ...cls,
                students: cls.students.filter(s => s.id !== studentId)
              };
            }
            return cls;
          });
          return { ...prev, classrooms: newClassrooms };
        });
        
        if (selectedStudentId === studentId) {
          setSelectedStudentId(null);
        }
        setModal({ type: null });
      }
    });
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, isLoggedIn: false }));
    setIsAdmin(false);
    setView('login');
  };

  const createClassroom = (name: string, adminId: string) => {
    if (!name.trim()) return;
    const newClass: Classroom = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      students: [],
      createdAt: Date.now(),
      adminId
    };
    setState(prev => ({
      ...prev,
      classrooms: [...prev.classrooms, newClass]
    }));
  };

  const deleteClassroom = (id: string) => {
    setModal({
      type: 'confirm-delete',
      title: '删除班级',
      message: '确定要删除该班级吗？所有学生数据都将丢失。',
      onConfirm: () => {
        setState(prev => ({
          ...prev,
          classrooms: prev.classrooms.filter(c => c.id !== id)
        }));
        if (selectedClassId === id) {
          setSelectedClassId(null);
          setView('admin');
        }
        setModal({ type: null });
      }
    });
  };

  const addStudent = (classId: string, name: string) => {
    setState(prev => ({
      ...prev,
      classrooms: prev.classrooms.map(c => {
        if (c.id === classId && c.students.length < MAX_STUDENTS_PER_CLASS) {
          return {
            ...c,
            students: [...c.students, { id: Math.random().toString(36).substr(2, 9), name }]
          };
        }
        return c;
      })
    }));
  };

  const adoptPet = async (classId: string, studentId: string, type: PetType, withAI: boolean) => {
    let generatedImage: string | undefined = undefined;
    
    if (withAI) {
      setIsGenerating(true);
      const initialStageName = PET_TEMPLATES[type].stages[0];
      const result = await generatePetImage(PET_TEMPLATES[type].name, type, initialStageName);
      if (result) generatedImage = result;
      setIsGenerating(false);
    }
    
    const initialStageName = PET_TEMPLATES[type].stages[0];
    const newPet: Pet = {
      id: Math.random().toString(36).substr(2, 9),
      name: initialStageName,
      type,
      level: 1,
      exp: 0,
      hunger: 100,
      cleanliness: 100,
      mood: 100,
      evolutionStage: 1,
      lastUpdate: Date.now(),
      adoptedAt: Date.now(),
      customImage: generatedImage
    };

    setState(prev => ({
      ...prev,
      classrooms: prev.classrooms.map(c => {
        if (c.id === classId) {
          return {
            ...c,
            students: c.students.map(s => {
              if (s.id === studentId) {
                const updatedPets = [...s.pets, newPet];
                return { 
                  ...s, 
                  pets: updatedPets, 
                  activePetId: newPet.id,
                  inventory: s.inventory || {} 
                };
              }
              return s;
            })
          };
        }
        return c;
      })
    }));
  };

  const distributeItem = (studentId: string, itemId: string, count: number) => {
    setState(prev => ({
      ...prev,
      classrooms: prev.classrooms.map(c => ({
        ...c,
        students: c.students.map(s => {
          if (s.id === studentId) {
            const newInventory = { ...s.inventory || {} };
            newInventory[itemId] = (newInventory[itemId] || 0) + count;
            return { ...s, inventory: newInventory };
          }
          return s;
        })
      }))
    }));
  };

  const useItem = (classId: string, studentId: string, itemId: string) => {
    const item = PET_ITEMS[itemId];
    if (!item) return;

    setState(prev => ({
      ...prev,
      classrooms: prev.classrooms.map(c => {
        if (c.id === classId) {
          return {
            ...c,
            students: c.students.map(s => {
              if (s.id === studentId && (s.inventory?.[itemId] || 0) > 0) {
                const updatedPets = s.pets.map(pet => {
                  if (pet.id !== s.activePetId) return pet;
                  
                  const updatedPet = { ...pet };
                  if (item.type === 'food') updatedPet.hunger = Math.min(100, updatedPet.hunger + item.effect);
                  if (item.type === 'cleaning') updatedPet.cleanliness = Math.min(100, updatedPet.cleanliness + item.effect);
                  if (item.type === 'toy') updatedPet.mood = Math.min(100, updatedPet.mood + item.effect);

                  updatedPet.exp += 20;
                  while (updatedPet.exp >= updatedPet.level * 100) {
                    updatedPet.exp -= updatedPet.level * 100;
                    updatedPet.level++;
                  }

                  if (updatedPet.level >= 40) updatedPet.evolutionStage = 5;
                  else if (updatedPet.level >= 30) updatedPet.evolutionStage = 4;
                  else if (updatedPet.level >= 20) updatedPet.evolutionStage = 3;
                  else if (updatedPet.level >= 10) updatedPet.evolutionStage = 2;
                  else updatedPet.evolutionStage = 1;

                  updatedPet.name = PET_TEMPLATES[updatedPet.type].stages[updatedPet.evolutionStage - 1];
                  updatedPet.lastUpdate = Date.now();
                  return updatedPet;
                });

                const newInventory = { ...s.inventory || {} };
                newInventory[itemId]--;
                if (newInventory[itemId] <= 0) delete newInventory[itemId];

                return { ...s, pets: updatedPets, inventory: newInventory };
              }
              return s;
            })
          };
        }
        return c;
      })
    }));
  };

  const updatePet = (classId: string, studentId: string, action: 'battle') => {
    const today = new Date().toISOString().split('T')[0];
    
    setState(prev => ({
      ...prev,
      classrooms: prev.classrooms.map(c => {
        if (c.id === classId) {
          return {
            ...c,
            students: c.students.map(s => {
              if (s.id === studentId) {
                const updatedPets = s.pets.map(pet => {
                  if (pet.id !== s.activePetId) return pet;
                  const updatedPet = { ...pet };
                  if (action === 'battle') {
                    updatedPet.lastBattleDate = today;
                  }
                  updatedPet.lastUpdate = Date.now();
                  return updatedPet;
                });
                return { ...s, pets: updatedPets };
              }
              return s;
            })
          };
        }
        return c;
      })
    }));
  };

  const startBattle = (opponent: Student) => {
    if (!activePet || !opponent.pets.find(p => p.id === opponent.activePetId)) return;
    
    const opponentPet = opponent.pets.find(p => p.id === opponent.activePetId)!;
    const playerMaxHp = activePet.level * 50 + 100;
    const opponentMaxHp = opponentPet.level * 50 + 100;

    setBattleOpponent(opponent);
    setBattleState({
      playerHp: playerMaxHp,
      opponentHp: opponentMaxHp,
      playerMaxHp,
      opponentMaxHp,
      playerAtkMod: 1,
      playerDefMod: 1,
      opponentAtkMod: 1,
      opponentDefMod: 1,
      turn: 'player',
      logs: [`战斗开始！${activePet.name} VS ${opponentPet.name}`],
      isFinished: false
    });
    setBattleResult(null);
  };

  const executeTurn = async (skillIndex: number) => {
    if (!battleState || !activePet || !battleOpponent?.pets.find(p => p.id === battleOpponent.activePetId) || battleState.isFinished || isBattling) return;

    setIsBattling(true);
    let newState = { ...battleState };
    const playerPet = activePet;
    const opponentPet = battleOpponent.pets.find(p => p.id === battleOpponent.activePetId)!;

    const attacker = newState.turn === 'player' ? playerPet : opponentPet;
    const defender = newState.turn === 'player' ? opponentPet : playerPet;
    const attackerAtkMod = newState.turn === 'player' ? newState.playerAtkMod : newState.opponentAtkMod;
    const attackerDefMod = newState.turn === 'player' ? newState.playerDefMod : newState.opponentDefMod;
    const defenderDefMod = newState.turn === 'player' ? newState.opponentDefMod : newState.playerDefMod;

    const skill = PET_TEMPLATES[attacker.type].skills[skillIndex];
    
    if (skill.type === 'attack') {
      const effectiveness = TYPE_EFFECTIVENESS[attacker.type]?.[defender.type] ?? 1;
      const baseDamage = skill.damage * (1 + attacker.level * 0.1);
      const damage = Math.floor(baseDamage * attackerAtkMod * (1 / defenderDefMod) * effectiveness * (0.9 + Math.random() * 0.2));
      
      if (newState.turn === 'player') {
        newState.opponentHp = Math.max(0, newState.opponentHp - damage);
      } else {
        newState.playerHp = Math.max(0, newState.playerHp - damage);
      }

      let effText = '';
      if (effectiveness > 1) effText = ' 效果拔群！';
      if (effectiveness < 1 && effectiveness > 0) effText = ' 收效甚微...';
      if (effectiveness === 0) effText = ' 似乎没有效果...';

      newState.logs = [`${attacker.name} 使用了 ${skill.name}，造成了 ${damage} 点伤害！${effText}`, ...newState.logs];
    } else if (skill.type === 'buff') {
      if (skill.name === '龙之舞') {
        if (newState.turn === 'player') {
          newState.playerAtkMod += 0.2;
          newState.playerDefMod += 0.2;
        } else {
          newState.opponentAtkMod += 0.2;
          newState.opponentDefMod += 0.2;
        }
      } else if (skill.name.includes('攻')) {
        if (newState.turn === 'player') newState.playerAtkMod += 0.3;
        else newState.opponentAtkMod += 0.3;
      } else {
        if (newState.turn === 'player') newState.playerDefMod += 0.3;
        else newState.opponentDefMod += 0.3;
      }
      newState.logs = [`${attacker.name} 使用了 ${skill.name}，属性提升了！`, ...newState.logs];
    } else if (skill.type === 'debuff') {
      if (skill.name.includes('攻')) {
        if (newState.turn === 'player') newState.opponentAtkMod = Math.max(0.5, newState.opponentAtkMod - 0.2);
        else newState.playerAtkMod = Math.max(0.5, newState.playerAtkMod - 0.2);
      } else {
        if (newState.turn === 'player') newState.opponentDefMod = Math.max(0.5, newState.opponentDefMod - 0.2);
        else newState.playerDefMod = Math.max(0.5, newState.playerDefMod - 0.2);
      }
      newState.logs = [`${attacker.name} 使用了 ${skill.name}，对手属性下降了！`, ...newState.logs];
    }

    // Check for win/loss
    if (newState.opponentHp <= 0) {
      newState.isFinished = true;
      handleBattleEnd(true);
    } else if (newState.playerHp <= 0) {
      newState.isFinished = true;
      handleBattleEnd(false);
    } else {
      newState.turn = newState.turn === 'player' ? 'opponent' : 'player';
    }

    setBattleState(newState);
    setIsBattling(false);
  };

  const handleBattleEnd = (win: boolean) => {
    if (!activePet) return;
    
    const expGained = win ? activePet.level * 30 + 100 : 0;
    const opponentPet = battleOpponent?.pets.find(p => p.id === battleOpponent.activePetId);
    
    setBattleResult({
      win,
      expGained,
      opponent: {
        name: opponentPet?.name,
        level: opponentPet?.level,
        type: opponentPet?.type
      }
    });

    if (win) {
      setState(prev => ({
        ...prev,
        classrooms: prev.classrooms.map(c => {
          if (c.id === selectedClassId) {
            return {
              ...c,
              students: c.students.map(s => {
                if (s.id === selectedStudentId) {
                  const updatedPets = s.pets.map(p => {
                    if (p.id !== s.activePetId) return p;
                    let { exp, level, evolutionStage, type } = p;
                    exp += expGained;
                    while (exp >= level * 100) {
                      exp -= level * 100;
                      level++;
                    }

                    if (level >= 40) evolutionStage = 5;
                    else if (level >= 30) evolutionStage = 4;
                    else if (level >= 20) evolutionStage = 3;
                    else if (level >= 10) evolutionStage = 2;
                    else evolutionStage = 1;

                    const name = PET_TEMPLATES[type].stages[evolutionStage - 1];
                    return { ...p, exp, level, evolutionStage, name };
                  });
                  return { ...s, pets: updatedPets };
                }
                return s;
              })
            };
          }
          return c;
        })
      }));
    }

    updatePet(selectedClassId!, selectedStudentId!, 'battle');
  };

  // Removed automatic AI turn trigger to allow manual control for both sides

  const currentClassrooms = useMemo(() => {
    if (isAdmin && state.currentAdminId) {
      return state.classrooms.filter(c => c.adminId === state.currentAdminId);
    }
    return state.classrooms;
  }, [state.classrooms, isAdmin, state.currentAdminId]);

  const currentClass = useMemo(() => 
    state.classrooms.find(c => c.id === selectedClassId), 
    [state.classrooms, selectedClassId]
  );

  const currentStudent = useMemo(() => 
    currentClass?.students.find(s => s.id === selectedStudentId),
    [currentClass, selectedStudentId]
  );

  const activePet = useMemo(() => 
    currentStudent?.pets.find(p => p.id === currentStudent.activePetId),
    [currentStudent]
  );

  const switchActivePet = (petId: string) => {
    setState(prev => ({
      ...prev,
      classrooms: prev.classrooms.map(c => ({
        ...c,
        students: c.students.map(s => s.id === selectedStudentId ? { ...s, activePetId: petId } : s)
      }))
    }));
  };

  // --- Render Helpers ---

  if (!state.isLoggedIn || view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="text-indigo-600 w-8 h-8 fill-current" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">PixelPet Academy</h1>
            <p className="text-gray-500">电子宠物养成学院</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">账号</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Barry01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="BarryPass"
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg active:scale-95"
            >
              登 录
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('classes')}>
            <Heart className="text-indigo-600 w-6 h-6 fill-current" />
            <span className="font-bold text-xl tracking-tight">PixelPet</span>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button 
                onClick={() => setView('admin')}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg font-bold text-sm transition-all ${view === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Shield size={18} />
                <span className="hidden sm:inline">管理员</span>
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">退出登录</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'admin' && isAdmin && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-gray-800">管理员控制台</h2>
                <div className="bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  Admin: {ADMINS.find(a => a.id === state.currentAdminId)?.name || state.currentAdminId}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Class & Student Selection */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider">选择班级</h3>
                      <button 
                        onClick={() => {
                          setModal({ type: 'create-class' });
                          setModalInput('');
                          setSelectedAdminId(state.currentAdminId || 'Barry');
                        }}
                        className="text-indigo-600 hover:text-indigo-700 p-1 rounded-lg hover:bg-indigo-50 transition-all"
                        title="创建新班级"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {currentClassrooms.map(cls => (
                        <button
                          key={cls.id}
                          onClick={() => { setSelectedClassId(cls.id); setSelectedStudentId(null); }}
                          className={`w-full text-left px-4 py-3 rounded-xl transition-all font-bold ${selectedClassId === cls.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                        >
                          {cls.name}
                        </button>
                      ))}
                      {currentClassrooms.length === 0 && (
                        <p className="text-center py-4 text-gray-400 text-xs italic">暂无所属班级</p>
                      )}
                    </div>
                  </div>

                  {selectedClassId && (
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                      <h3 className="font-bold mb-4 text-gray-500 text-sm uppercase tracking-wider">选择学生</h3>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {currentClass?.students.map(student => (
                          <div key={student.id} className="flex items-center gap-2 group">
                            <button
                              onClick={() => setSelectedStudentId(student.id)}
                              className={`flex-1 text-left px-4 py-3 rounded-xl transition-all font-bold flex items-center justify-between ${selectedStudentId === student.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                            >
                              <span>{student.name}</span>
                              {student.pet && <span className="text-[10px] opacity-60">Lv.{student.pet.level}</span>}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteStudent(selectedClassId!, student.id); }}
                              className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              title="删除学生"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Item Distribution */}
                <div className="lg:col-span-2">
                  {selectedStudentId && currentStudent ? (
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 h-full">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800">{currentStudent.name} 的背包</h3>
                          <p className="text-gray-500 text-sm">分配道具给学生，用完即空</p>
                        </div>
                        {currentStudent.pet && (
                          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl">
                            <div className={`w-10 h-10 rounded-xl ${PET_TEMPLATES[currentStudent.pet.type].color} flex items-center justify-center text-white`}>
                              {React.createElement(PET_TEMPLATES[currentStudent.pet.type].icon, { size: 20 })}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-800">{currentStudent.pet.name}</p>
                              <p className="text-[10px] text-gray-500">Lv.{currentStudent.pet.level}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Current Inventory */}
                        <div>
                          <h4 className="font-bold text-sm text-gray-400 mb-4 uppercase tracking-widest">当前库存</h4>
                          <div className="space-y-3">
                            {Object.entries(currentStudent.inventory || {}).map(([itemId, count]) => (
                              <div key={itemId} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${PET_ITEMS[itemId].type === 'food' ? 'bg-orange-100 text-orange-600' : PET_ITEMS[itemId].type === 'cleaning' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                    {PET_ITEMS[itemId].type === 'food' ? <Utensils size={16} /> : PET_ITEMS[itemId].type === 'cleaning' ? <Sparkles size={16} /> : <Heart size={16} />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-gray-800">{PET_ITEMS[itemId].name}</p>
                                    <p className="text-[10px] text-gray-500">{PET_ITEMS[itemId].description}</p>
                                  </div>
                                </div>
                                <span className="bg-white px-3 py-1 rounded-lg text-xs font-black shadow-sm">x{count}</span>
                              </div>
                            ))}
                            {Object.keys(currentStudent.inventory || {}).length === 0 && (
                              <p className="text-center py-10 text-gray-300 font-bold italic">背包空空如也</p>
                            )}
                          </div>
                        </div>

                        {/* Add Items */}
                        <div>
                          <h4 className="font-bold text-sm text-gray-400 mb-4 uppercase tracking-widest">分配新道具</h4>
                          <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {Object.entries(PET_ITEMS).map(([id, item]) => (
                              <button
                                key={id}
                                onClick={() => distributeItem(currentStudent.id, id, 1)}
                                className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all group text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${item.type === 'food' ? 'bg-orange-50 text-orange-400 group-hover:bg-orange-500 group-hover:text-white' : item.type === 'cleaning' ? 'bg-blue-50 text-blue-400 group-hover:bg-blue-500 group-hover:text-white' : 'bg-purple-50 text-purple-400 group-hover:bg-purple-500 group-hover:text-white'}`}>
                                    {item.type === 'food' ? <Utensils size={16} /> : item.type === 'cleaning' ? <Sparkles size={16} /> : <Heart size={16} />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-gray-800">{item.name}</p>
                                    <p className="text-[10px] text-gray-500">效果: +{item.effect}</p>
                                  </div>
                                </div>
                                <Plus size={16} className="text-gray-300 group-hover:text-indigo-600" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-20 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Users size={40} className="text-gray-200" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-400">请在左侧选择一名学生进行操作</h3>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {view === 'classes' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="text-indigo-600" />
                  我的班级
                </h2>
                <button 
                  onClick={() => {
                    setModal({ type: 'create-class' });
                    setModalInput('');
                    setSelectedAdminId(state.currentAdminId || 'Barry');
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                >
                  <Plus size={20} />
                  创建班级
                </button>
              </div>

              {currentClassrooms.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">还没有班级，快去创建一个吧！</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentClassrooms.map(cls => (
                    <motion.div 
                      key={cls.id}
                      whileHover={{ y: -4 }}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-bold text-gray-800">{cls.name}</h3>
                          {isAdmin && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteClassroom(cls.id); }}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                        <p className="text-gray-500 mb-6">学生人数: {cls.students.length} / {MAX_STUDENTS_PER_CLASS}</p>
                      </div>
                      <button 
                        onClick={() => { setSelectedClassId(cls.id); setView('class-detail'); }}
                        className="w-full bg-gray-50 text-indigo-600 py-2 rounded-xl font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                      >
                        进入班级 <ChevronRight size={18} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'class-detail' && currentClass && (
            <motion.div 
              key="class-detail"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <button 
                onClick={() => setView('classes')}
                className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
              >
                <ArrowLeft size={20} /> 返回列表
              </button>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">{currentClass.name}</h2>
                  <p className="text-gray-500">班级成员列表</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setBattleResult(null);
                      setBattleState(null);
                      setBattleOpponent(null);
                      setView('arena');
                    }}
                    className="bg-red-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg font-bold active:scale-95"
                  >
                    <Trophy size={20} /> 角斗场
                  </button>
                  {currentClass.students.length < MAX_STUDENTS_PER_CLASS && (
                    <button 
                      onClick={() => {
                        setModal({ type: 'add-student' });
                        setModalInput('');
                      }}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg font-bold active:scale-95"
                    >
                      <Plus size={20} /> 添加学生
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentClass.students.map(student => (
                  <motion.div 
                    key={student.id}
                    onClick={() => { setSelectedStudentId(student.id); setView('pet-view'); }}
                    className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      {student.pet ? (
                        React.createElement(PET_TEMPLATES[student.pet.type].icon, { size: 24 })
                      ) : (
                        <UserIcon size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{student.name}</h4>
                      <p className="text-xs text-gray-500">
                        {student.pets.length > 0 ? `拥有 ${student.pets.length} 只宠物 (Lv.${student.pets.find(p => p.id === student.activePetId)?.level || student.pets[0].level})` : '尚未领养宠物'}
                      </p>
                    </div>
                    <ChevronRight className="text-gray-300" size={20} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'pet-view' && currentStudent && (
            <motion.div 
              key="pet-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <button 
                onClick={() => setView('class-detail')}
                className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
              >
                <ArrowLeft size={20} /> 返回班级
              </button>

              {(!currentStudent.pets || currentStudent.pets.length === 0) ? (
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                  <h2 className="text-2xl font-bold text-center mb-8">领养你的第一个宠物</h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {(Object.keys(PET_TEMPLATES) as PetType[]).map(type => {
                      const template = PET_TEMPLATES[type];
                      return (
                        <button 
                          key={type}
                          onClick={() => setPreviewPetType(type)}
                          className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-all group border border-transparent hover:border-indigo-100"
                        >
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-1">
                            <div className={`absolute inset-0 ${template.color} rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity`} />
                            <img 
                              src={template.images[0]} 
                              alt={template.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm text-indigo-600">
                              <template.icon size={14} />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gray-700">{template.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Adoption Preview Modal */}
                  <AnimatePresence>
                    {previewPetType && (
                      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setPreviewPetType(null)}
                          className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 20 }}
                          className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl relative z-10 overflow-hidden"
                        >
                          <div className={`absolute top-0 left-0 w-full h-2 ${PET_TEMPLATES[previewPetType].color}`} />
                          
                          <div className="flex justify-between items-start mb-8">
                            <div>
                              <h3 className="text-3xl font-black text-gray-800">{PET_TEMPLATES[previewPetType].name}</h3>
                              <p className="text-gray-500">进化预览 · 三阶段形态</p>
                            </div>
                            <button 
                              onClick={() => setPreviewPetType(null)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <Plus size={24} className="rotate-45" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-10">
                            {PET_TEMPLATES[previewPetType].stages.map((stageName, index) => (
                              <div key={index} className="flex flex-col items-center">
                                <div className="relative mb-4 group">
                                  <div className={`absolute inset-0 ${PET_TEMPLATES[previewPetType].color} rounded-2xl opacity-10 blur-xl group-hover:opacity-20 transition-opacity`} />
                                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-slate-100 flex items-center justify-center overflow-hidden relative bg-gray-50 shadow-inner">
                                    <img 
                                      src={PET_TEMPLATES[previewPetType].images[index]} 
                                      className="w-full h-full object-cover"
                                      alt={stageName}
                                    />
                                    <div className="absolute top-1 left-1 bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-lg text-[8px] font-black text-indigo-600 shadow-sm">
                                      形态 {index + 1}
                                    </div>
                                  </div>
                                </div>
                                <span className="font-bold text-gray-700 text-xs text-center px-1">{stageName}</span>
                                <span className="text-[8px] text-gray-400 mt-1">
                                  {index === 0 ? '初始形态' : `Lv.${index * 10} 进化`}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-2 mb-8 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                            <input 
                              type="checkbox" 
                              id="useAI" 
                              checked={useAI}
                              onChange={(e) => setUseAI(e.target.checked)}
                              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="useAI" className="text-sm font-bold text-indigo-900 cursor-pointer select-none">
                              使用 Gemini AI 召唤独一无二的形象 (洛克王国风格)
                            </label>
                          </div>

                          <div className="flex gap-4">
                            <button 
                              onClick={() => setPreviewPetType(null)}
                              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                            >
                              再看看
                            </button>
                            <button 
                              disabled={isGenerating}
                              onClick={async () => {
                                const type = previewPetType;
                                setPreviewPetType(null);
                                await adoptPet(selectedClassId!, selectedStudentId!, type, useAI);
                              }}
                              className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isGenerating ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  正在召唤...
                                </>
                              ) : (
                                <>领养 {PET_TEMPLATES[previewPetType].name}</>
                              )}
                            </button>
                          </div>
                          {currentStudent.pets.length > 0 && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                              <p className="text-xs font-bold text-blue-800 text-center">
                                领养条件：当前最后一只宠物需达到第3阶段（20级）。
                                <br />
                                当前状态：{currentStudent.pets[currentStudent.pets.length - 1].name} (阶段 {currentStudent.pets[currentStudent.pets.length - 1].evolutionStage})
                              </p>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                  {/* Pet Selector for Multiple Pets */}
                  {currentStudent.pets.length > 0 && (
                    <div className="bg-gray-50 p-4 border-b border-gray-100 flex gap-3 overflow-x-auto custom-scrollbar">
                      {currentStudent.pets.map(p => (
                        <button
                          key={p.id}
                          onClick={() => switchActivePet(p.id)}
                          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl transition-all font-bold text-sm ${currentStudent.activePetId === p.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                        >
                          <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/20">
                            <img src={p.customImage || PET_TEMPLATES[p.type].images[p.evolutionStage - 1]} className="w-full h-full object-cover" alt="" />
                          </div>
                          {p.name}
                        </button>
                      ))}
                      {currentStudent.pets.length < 3 && (
                        <button
                          onClick={() => {
                            const lastPet = currentStudent.pets[currentStudent.pets.length - 1];
                            if (lastPet && lastPet.evolutionStage < 3) {
                              setModal({
                                type: 'alert',
                                title: '领养限制',
                                message: `需要将当前最后一只宠物进化到第3阶段（20级）才能领养下一只！\n当前进化阶段: ${lastPet.evolutionStage}`
                              });
                              return;
                            }
                            setView('class-detail');
                          }}
                          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50 transition-all font-bold text-sm"
                        >
                          <Plus size={16} />
                          领养新宠物
                        </button>
                      )}
                    </div>
                  )}

                  {!activePet ? (
                    <div className="p-20 text-center">
                      <p className="text-gray-400 font-bold">请先领养一只宠物</p>
                    </div>
                  ) : (
                    <>
                      {/* Pet Header */}
                      <div className={`${PET_TEMPLATES[activePet.type].color} p-8 text-white relative overflow-hidden min-h-[320px] flex items-center justify-center`}>
                        <div className="relative z-10 flex flex-col items-center w-full">
                          <motion.div 
                            key={activePet.id}
                            animate={{ 
                              y: [0, -15, 0],
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="relative"
                          >
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-white/30 blur-3xl rounded-full scale-150 animate-pulse" />
                            
                            <img 
                              src={activePet.customImage || PET_TEMPLATES[activePet.type].images[activePet.evolutionStage - 1]} 
                              alt={activePet.name}
                              referrerPolicy="no-referrer"
                              className="w-48 h-48 sm:w-56 sm:h-56 object-cover rounded-3xl shadow-2xl border-4 border-white/50 relative z-10"
                            />
                            
                            {/* Evolution Badge */}
                            <div className="absolute -top-4 -right-4 bg-white text-indigo-600 p-2 rounded-2xl shadow-xl font-black text-sm flex items-center gap-1 z-20">
                              <Trophy size={16} className="text-yellow-500" />
                              {PET_TEMPLATES[activePet.type].stages[activePet.evolutionStage - 1]}
                            </div>
                          </motion.div>
                          
                          <div className="mt-6 text-center">
                            <h2 className="text-4xl font-black tracking-tighter mb-1 drop-shadow-md">{activePet.name}</h2>
                            <div className="flex items-center justify-center gap-2">
                              <span className="bg-black/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm flex items-center gap-1">
                                {React.createElement(PET_TEMPLATES[activePet.type].icon, { size: 12 })}
                                {PET_TEMPLATES[activePet.type].name}
                              </span>
                              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                Lv.{activePet.level}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white/20 rounded-full" />
                          <div className="absolute bottom-20 right-10 w-24 h-24 border-8 border-white/10 rounded-full" />
                          <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-white/20 rotate-45" />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm font-bold text-gray-600">
                              <span className="flex items-center gap-1"><Utensils size={14} /> 饱食度</span>
                              <span>{Math.round(activePet.hunger)}%</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${activePet.hunger}%` }}
                                className={`h-full ${activePet.hunger > 50 ? 'bg-orange-400' : 'bg-red-400'}`}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm font-bold text-gray-600">
                              <span className="flex items-center gap-1"><Sparkles size={14} /> 整洁度</span>
                              <span>{Math.round(activePet.cleanliness)}%</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${activePet.cleanliness}%` }}
                                className={`h-full ${activePet.cleanliness > 50 ? 'bg-blue-400' : 'bg-red-400'}`}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm font-bold text-gray-600">
                              <span className="flex items-center gap-1"><Heart size={14} /> 心情</span>
                              <span>{Math.round(activePet.mood)}%</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${activePet.mood}%` }}
                                className={`h-full ${activePet.mood > 50 ? 'bg-purple-400' : 'bg-red-400'}`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-8">
                          <div className="flex justify-between text-sm font-bold text-gray-600">
                            <span className="flex items-center gap-1"><Trophy size={14} /> 经验值</span>
                            <span>{Math.round(activePet.exp)} / {activePet.level * 100}</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(activePet.exp / (activePet.level * 100)) * 100}%` }}
                              className="h-full bg-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Inventory & Actions */}
                        <div className="bg-gray-50 rounded-3xl p-6 mb-8">
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">我的背包</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(currentStudent.inventory || {}).map(([itemId, count]) => {
                              const item = PET_ITEMS[itemId];
                              return (
                                <button
                                  key={itemId}
                                  onClick={() => useItem(selectedClassId!, currentStudent.id, itemId)}
                                  className="bg-white p-3 rounded-2xl border border-gray-100 hover:border-indigo-500 hover:shadow-md transition-all flex flex-col items-center gap-1 group relative"
                                >
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'food' ? 'bg-orange-50 text-orange-500' : item.type === 'cleaning' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>
                                    {item.type === 'food' ? <Utensils size={18} /> : item.type === 'cleaning' ? <Sparkles size={18} /> : <Heart size={18} />}
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-700">{item.name}</span>
                                  <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                    {count}
                                  </div>
                                </button>
                              );
                            })}
                            {Object.keys(currentStudent.inventory || {}).length === 0 && (
                              <div className="col-span-full py-6 text-center text-gray-300 text-xs font-bold italic">
                                背包里没有道具，请联系管理员 {ADMINS.find(a => a.id === currentClass?.adminId)?.name || '管理员'} 分配
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Info Footer */}
                      <div className="bg-gray-50 p-6 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-500">
                          领养于: {new Date(activePet.adoptedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {view === 'arena' && currentClass && (
            <motion.div 
              key="arena"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto"
            >
              <button 
                onClick={() => {
                  setView('class-detail');
                  setBattleState(null);
                  setBattleOpponent(null);
                }}
                className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
              >
                <ArrowLeft size={20} /> 返回班级
              </button>

              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border-4 border-slate-800 min-h-[600px] flex flex-col">
                {/* Arena Background Decor */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-red-500/20" />
                </div>

                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="text-center mb-8">
                    <h2 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 uppercase italic">
                      Pixel Arena
                    </h2>
                    <p className="text-slate-400 font-bold tracking-widest text-xs">班级荣誉之战</p>
                  </div>

                  {!selectedStudentId ? (
                    /* Select Your Pet */
                    <div className="flex-1 flex flex-col">
                      <h3 className="text-xl font-bold mb-6 text-center">选择你的出战宠物</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {currentClass.students
                          .filter(s => s.pets.length > 0)
                          .map(student => {
                            const pet = student.pets.find(p => p.id === student.activePetId) || student.pets[0];
                            return (
                              <button
                                key={student.id}
                                onClick={() => setSelectedStudentId(student.id)}
                                className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 hover:border-indigo-500 hover:bg-slate-800 transition-all flex items-center gap-4 group"
                              >
                                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-600 group-hover:border-indigo-500 transition-colors">
                                  <img 
                                    src={pet.customImage || PET_TEMPLATES[pet.type].images[pet.evolutionStage - 1]} 
                                    className="w-full h-full object-cover"
                                    alt=""
                                  />
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-slate-200">{student.name}</p>
                                  <p className="text-xs text-slate-400">{pet.name}</p>
                                  <p className="text-[10px] font-black text-indigo-400">Lv.{pet.level}</p>
                                </div>
                              </button>
                            );
                          })}
                        {currentClass.students.filter(s => s.pets.length > 0).length === 0 && (
                          <div className="col-span-full py-20 text-center text-slate-500 font-bold">
                            班级里还没有同学领养宠物...
                          </div>
                        )}
                      </div>
                    </div>
                  ) : !battleState ? (
                    /* Opponent Selection */
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <button 
                          onClick={() => setSelectedStudentId(null)}
                          className="text-xs text-indigo-400 hover:underline"
                        >
                          更换出战宠物
                        </button>
                        <h3 className="text-xl font-bold text-center flex-1">选择你的对手</h3>
                        <div className="w-20" /> {/* Spacer */}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {currentClass?.students
                          .filter(s => s.id !== selectedStudentId && s.pets.length > 0)
                          .map(student => {
                            const pet = student.pets.find(p => p.id === student.activePetId) || student.pets[0];
                            return (
                              <button
                                key={student.id}
                                onClick={() => startBattle(student)}
                                className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 hover:border-red-500 hover:bg-slate-800 transition-all flex items-center gap-4 group"
                              >
                                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-600 group-hover:border-red-500 transition-colors">
                                  <img 
                                    src={pet.customImage || PET_TEMPLATES[pet.type].images[pet.evolutionStage - 1]} 
                                    className="w-full h-full object-cover"
                                    alt=""
                                  />
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-slate-200">{student.name}</p>
                                  <p className="text-xs text-slate-400">{pet.name}</p>
                                  <p className="text-[10px] font-black text-red-400">Lv.{pet.level}</p>
                                </div>
                              </button>
                            );
                          })}
                        {currentClass?.students.filter(s => s.id !== selectedStudentId && s.pets.length > 0).length === 0 && (
                          <div className="col-span-full py-20 text-center text-slate-500 font-bold">
                            班级里还没有其他同学领养宠物...
                          </div>
                        )}
                      </div>
                      
                      {activePet?.lastBattleDate === new Date().toISOString().split('T')[0] && (
                        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                          <p className="text-red-400 font-bold text-sm">今日战斗机会已用完</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Battle Screen */
                    <div className="flex-1 flex flex-col">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-12">
                        {/* Player Pet */}
                        <div className="flex flex-col items-center gap-4 flex-1">
                          <div className="w-full space-y-2 mb-4">
                            <div className="flex justify-between text-xs font-black items-end">
                              <span className="text-sm">{activePet.name}</span>
                              <div className="flex gap-1 mb-0.5">
                                {battleState.playerAtkMod > 1 && <span className="text-[10px] bg-red-500/30 text-red-400 px-2 py-0.5 rounded-full border border-red-500/50 font-bold">攻击↑</span>}
                                {battleState.playerDefMod > 1 && <span className="text-[10px] bg-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/50 font-bold">防御↑</span>}
                                {battleState.playerAtkMod < 1 && <span className="text-[10px] bg-gray-500/30 text-gray-400 px-2 py-0.5 rounded-full border border-gray-500/50 font-bold">攻击↓</span>}
                                {battleState.playerDefMod < 1 && <span className="text-[10px] bg-gray-500/30 text-gray-400 px-2 py-0.5 rounded-full border border-gray-500/50 font-bold">防御↓</span>}
                              </div>
                              <span className="text-slate-400">{Math.ceil(battleState.playerHp)} / {battleState.playerMaxHp}</span>
                            </div>
                            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700 shadow-inner">
                              <motion.div 
                                animate={{ width: `${(battleState.playerHp / battleState.playerMaxHp) * 100}%` }}
                                className={`h-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${battleState.playerHp > battleState.playerMaxHp * 0.5 ? 'bg-gradient-to-r from-green-600 to-green-400' : battleState.playerHp > battleState.playerMaxHp * 0.2 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`}
                              />
                            </div>
                          </div>
                          <motion.div 
                            animate={battleState.turn === 'player' ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="relative"
                          >
                            <div className={`absolute inset-0 ${PET_TEMPLATES[activePet.type].color} blur-2xl opacity-40`} />
                            <img 
                              src={activePet.customImage || PET_TEMPLATES[activePet.type].images[activePet.evolutionStage - 1]} 
                              className="w-40 h-40 object-cover rounded-3xl border-4 border-white/20 relative z-10"
                              alt=""
                            />
                          </motion.div>
                        </div>

                        <div className="text-4xl font-black italic text-red-600 animate-pulse">VS</div>

                        {/* Opponent Pet */}
                        <div className="flex flex-col items-center gap-4 flex-1">
                          <div className="w-full space-y-2 mb-4">
                            <div className="flex justify-between text-xs font-black items-end">
                              <span className="text-sm">{battleOpponent?.pets.find(p => p.id === battleOpponent.activePetId)?.name}</span>
                              <div className="flex gap-1 mb-0.5">
                                {battleState.opponentAtkMod > 1 && <span className="text-[10px] bg-red-500/30 text-red-400 px-2 py-0.5 rounded-full border border-red-500/50 font-bold">攻击↑</span>}
                                {battleState.opponentDefMod > 1 && <span className="text-[10px] bg-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/50 font-bold">防御↑</span>}
                                {battleState.opponentAtkMod < 1 && <span className="text-[10px] bg-gray-500/30 text-gray-400 px-2 py-0.5 rounded-full border border-gray-500/50 font-bold">攻击↓</span>}
                                {battleState.opponentDefMod < 1 && <span className="text-[10px] bg-gray-500/30 text-gray-400 px-2 py-0.5 rounded-full border border-blue-500/50 font-bold">防御↓</span>}
                              </div>
                              <span className="text-slate-400">{Math.ceil(battleState.opponentHp)} / {battleState.opponentMaxHp}</span>
                            </div>
                            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700 shadow-inner">
                              <motion.div 
                                animate={{ width: `${(battleState.opponentHp / battleState.opponentMaxHp) * 100}%` }}
                                className={`h-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${battleState.opponentHp > battleState.opponentMaxHp * 0.5 ? 'bg-gradient-to-r from-green-600 to-green-400' : battleState.opponentHp > battleState.opponentMaxHp * 0.2 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`}
                              />
                            </div>
                          </div>
                          <motion.div 
                            animate={battleState.turn === 'opponent' ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="relative"
                          >
                            <div className={`absolute inset-0 ${PET_TEMPLATES[battleOpponent!.pets.find(p => p.id === battleOpponent.activePetId)!.type].color} blur-2xl opacity-40`} />
                            <img 
                              src={battleOpponent?.pets.find(p => p.id === battleOpponent.activePetId)?.customImage || PET_TEMPLATES[battleOpponent!.pets.find(p => p.id === battleOpponent.activePetId)!.type].images[battleOpponent!.pets.find(p => p.id === battleOpponent.activePetId)!.evolutionStage - 1]} 
                              className="w-40 h-40 object-cover rounded-3xl border-4 border-white/20 relative z-10"
                              alt=""
                            />
                            {isBattling && battleState.turn === 'opponent' && (
                              <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40 rounded-3xl">
                                <div className="flex gap-1">
                                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-white rounded-full" />
                                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-white rounded-full" />
                                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-white rounded-full" />
                                </div>
                              </div>
                            )}
                          </motion.div>
                        </div>
                      </div>

                      {/* Battle Log & Controls */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-auto">
                        <div className="lg:col-span-2 bg-slate-800/50 rounded-3xl p-4 h-40 overflow-y-auto border border-slate-700 custom-scrollbar flex flex-col-reverse">
                          {battleState.logs.map((log, i) => (
                            <p key={i} className={`text-xs mb-1 font-bold ${i === 0 ? 'text-white' : 'text-slate-500'}`}>
                              {i === 0 && <span className="text-red-500 mr-2">▶</span>}
                              {log}
                            </p>
                          ))}
                        </div>

                        <div className="bg-slate-800/80 rounded-3xl p-4 border border-slate-700 flex flex-col justify-center gap-2">
                          {battleState.isFinished ? (
                            <div className="text-center">
                              <h4 className={`text-2xl font-black mb-2 ${battleResult?.win ? 'text-yellow-400' : 'text-slate-400'}`}>
                                {battleResult?.win ? '胜利！' : '战败'}
                              </h4>
                              <p className="text-[10px] text-slate-400 mb-3">
                                {battleResult?.win ? `获得 ${battleResult.expGained} 经验` : '再接再厉！'}
                              </p>
                              <button 
                                onClick={() => {
                                  setView('class-detail');
                                  setBattleState(null);
                                  setBattleOpponent(null);
                                }}
                                className="w-full py-2 bg-white text-slate-900 rounded-xl font-bold text-sm"
                              >
                                离开战场
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] font-black text-slate-400">选择技能：</p>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${battleState.turn === 'player' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-red-500/20 text-red-400'}`}>
                                  {battleState.turn === 'player' ? activePet.name : battleOpponent.pets.find(p => p.id === battleOpponent.activePetId)?.name} 的回合
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {PET_TEMPLATES[battleState.turn === 'player' ? activePet.type : battleOpponent.pets.find(p => p.id === battleOpponent.activePetId)!.type].skills.map((skill, i) => (
                                  <button
                                    key={i}
                                    disabled={isBattling}
                                    onClick={() => executeTurn(i)}
                                    className={`py-2 px-3 rounded-xl text-left transition-all group border ${
                                      battleState.turn === 'player' 
                                        ? 'bg-slate-700 hover:bg-indigo-600 border-slate-600 hover:border-indigo-400' 
                                        : 'bg-slate-700 hover:bg-red-600 border-slate-600 hover:border-red-400'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs font-bold">{skill.name}</span>
                                      <span className="text-[8px] font-black text-slate-400 group-hover:text-white">威力 {skill.damage}</span>
                                    </div>
                                    <p className="text-[8px] text-slate-500 group-hover:text-slate-100">{skill.effect}</p>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Custom Modal */}
      <AnimatePresence>
        {modal.type && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModal({ type: null })}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative z-10"
            >
              <h3 className="text-xl font-bold mb-4 text-gray-800">
                {modal.title || (modal.type === 'create-class' ? '创建新班级' : '添加新学生')}
              </h3>
              
              {(modal.type === 'create-class' || modal.type === 'add-student') ? (
                <>
                  <input 
                    autoFocus
                    type="text"
                    value={modalInput}
                    onChange={e => setModalInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (modal.type === 'create-class') createClassroom(modalInput, selectedAdminId);
                        else if (modal.type === 'add-student') addStudent(selectedClassId!, modalInput);
                        setModal({ type: null });
                      }
                    }}
                    placeholder={modal.type === 'create-class' ? '请输入班级名称' : '请输入学生姓名'}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  {modal.type === 'create-class' && (
                    <div className="mb-6">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">所属管理员</label>
                      <select 
                        value={selectedAdminId}
                        onChange={e => setSelectedAdminId(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white"
                      >
                        {ADMINS.map(admin => (
                          <option key={admin.id} value={admin.id}>{admin.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-600 mb-6 whitespace-pre-wrap text-sm leading-relaxed">{modal.message}</p>
              )}

              <div className="flex gap-3">
                {modal.type !== 'alert' && (
                  <button 
                    onClick={() => setModal({ type: null })}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (modal.type === 'create-class') createClassroom(modalInput, selectedAdminId);
                    else if (modal.type === 'add-student') addStudent(selectedClassId!, modalInput);
                    else if (modal.type === 'confirm-delete' && modal.onConfirm) modal.onConfirm();
                    else setModal({ type: null });
                  }}
                  className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors shadow-lg ${modal.type === 'confirm-delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  确认
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
