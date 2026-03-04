# Análise de Leitura e Escrita do Firestore

Este documento descreve quais operações de leitura e escrita o usuário realiza durante a experiência no site e apresenta um conjunto de regras do Cloud Firestore que atendem aos requisitos do aplicativo.

> **Contexto**: o erro `FirebaseError: Missing or insufficient permissions` aparece em `Vehicles.tsx:70 handleSave` porque as regras atuais negam qualquer acesso (`allow read, write: if false`).

---

## Operações realizadas pelo frontend

1. **Veículos (`vehicles` collection)**
   - `getDocs(query(collection(db, "vehicles"), where("userId", "==", user.uid)))`
     - leitura de todos os veículos cadastrados pelo usuário autenticado.
   - `addDoc(collection(db, "vehicles"), { name, model, status, userId: user.uid, ... })`
     - criação de um veículo atribuindo `userId` igual ao UID do usuário.
   - `updateDoc(doc(db, "vehicles", editId), { name, model, status })`
     - atualização de um veículo existente (sem alterar `userId`).
   - `deleteDoc(doc(db, "vehicles", id))`
     - exclusão de um veículo.

2. **Missões (`missions` collection)**
   - `getDocs(query(collection(db, "missions"), where("userId", "==", user.uid)))`
     - leitura das missões do usuário.
   - `addDoc(collection(db, "missions"), { name, vehicleId, vehicleName, waypoints, status, userId: user.uid, ... })`
     - criação de uma missão vinculada ao usuário.
   - `deleteDoc(doc(db, "missions", id))`
     - exclusão de uma missão.

3. **Dashboard / Home**
   - também realiza as mesmas consultas acima para mostrar contadores/tiles.

> **Importante**: não há leituras ou escritas em coleções diferentes dessas duas (não há perfil de usuários salvo no Firestore, por exemplo).

---

## Regras de segurança necessárias

As regras devem garantir que:

- Apenas usuários autenticados possam ler e escrever dados.
- Cada usuário só consiga acessar documentos cujo campo `userId` corresponda ao seu UID.
- A criação de documentos exige que o `request.resource.data.userId` seja igual ao UID autenticado.
- Atualizações/remoções só são permitidas no próprio documento do usuário.

A sintaxe padrão do Firebase para as regras fica assim:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // veículos do usuário
    match /vehicles/{vehicleId} {
      allow read:   if request.auth != null
                     && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
                     && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null
                             && resource.data.userId == request.auth.uid;
    }

    // missões do usuário
    match /missions/{missionId} {
      allow read:   if request.auth != null
                     && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
                     && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null
                             && resource.data.userId == request.auth.uid;
    }

    // bloqueia todo o resto por padrão
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

> **Nota**: para que as consultas com `where("userId", "==", user.uid)` funcionem, as regras de leitura acima certificam que cada documento retornado tenha `userId` igual ao `request.auth.uid`. O Firestore aplica as regras por documento na hora de executar a query.

---

## Próximos passos

1. Copie o bloco de regras acima para a seção de regras do Firestore no console do Firebase (ou no arquivo `firestore.rules` se você estiver usando `firebase deploy`).
2. Publique as regras e teste novamente o cadastro/edição/exclusão de veículos e missões.
3. Certifique-se de que usuários não autenticados não consigam ver nada -- o `request.auth != null` já bloqueia esse caso.

Com essas regras em vigor, o erro de permissões insuficientes deve desaparecer e o aplicativo ficará seguro contra acessos indevidos.

---

_Arquivo gerado em 4 de março de 2026._