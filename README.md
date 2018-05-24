# PSFPN
Projet SFPN M1S2

# Utilisation

## quantumCoin.sol

### Sur macOS (les autres versions sont similaires)

1) Délécharger la dernière version de Ethereum Wallet :

https://github.com/ethereum/mist/releases/tag/v0.10.0

2) Lancez l'application.

3) Pour utiliser le réseau local et non pas la blockchain d'Ethereum, connectez-vous au réseau "solo network" :

![Alt text](https://github.com/b1d0u/PSFPN/blob/master/imgs/image_readme_1.png)

Vous devriez avoir accès à un compte "Main Account (Etherbase)" avec un nombre plutôt conséquent d'ethers.

4) Pour créer le contrat, allez dans l'onglet "Contracts" puis "Deploy new contract" :

![Alt text](https://github.com/b1d0u/PSFPN/blob/master/imgs/image_readme_2.png)

Collez le code du contrat qui se trouve dans QuantumCoin/quantumCoin.sol puis sélectionnez le contrat "Quantum Coin" :

![Alt text](https://github.com/b1d0u/PSFPN/blob/master/imgs/image_readme_3.png)

Ajustez la difficulté (puissance de 2 !) :

![Alt text](https://github.com/b1d0u/PSFPN/blob/master/imgs/image_readme_4.png)

Enfin, tout en bas de la page, cliquez sur "Deploy" :

![Alt text](https://github.com/b1d0u/PSFPN/blob/master/imgs/image_readme_5.png)

Un popup s'ouvrira, vous demandant confirmation de la création, cliquez sur "Send Transaction". Le contrat est alors envoyé à la blockchain locale mais n'est pas encore accessible car il n'a pas encore été mis dans un bloc. Pour ce faire, créez un nouveau compte (on en aura besoin plus tard) :

![Alt text](https://github.com/b1d0u/PSFPN/blob/master/imgs/image_readme_6.png)

On vous demandera alors un mot de passe d'au moins 8 caractère, souvenez-vous-en (ici, dans un élan d'originalité, nous utiliserons le mot de passe "password"). Vous devriez alors voir votre nouveau compte dans l'onglet "Wallets". Cliquez dessus :

![Alt text](https://github.com/b1d0u/PSFPN/blob/master/imgs/image_readme_7.png)

Envoyez-lui un peu d'ether, par exemple 10.0 :

![Alt text](https://github.com/b1d0u/PSFPN/blob/master/imgs/image_readme_8.png)
![Alt text](https://github.com/b1d0u/PSFPN/blob/master/imgs/image_readme_9.png)
![Alt text](https://github.com/b1d0u/PSFPN/blob/master/imgs/image_readme_10.png)

Validez la transaction en cliquant sur "Send Transaction". Cela va ajouter les blocs à la chaîne et le contrat est alors accessible dans l'onglet "Contracts". Cliquez dessus et vous arriverez enfin à l'interface de gestion du contrat :

![Alt text](https://github.com/b1d0u/PSFPN/blob/master/imgs/image_readme_11.png)
