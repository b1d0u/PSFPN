pragma solidity ^0.4.21;

contract QuantumCoin {
	// Le mot clé "public" rend ces variables
	// visibles depuis l'extérieur
	// Toutes les variables sont expliquées dans le constructeur
	address public minter;
	uint public powDifficulty;
	uint public numberOfTransactionsInLedger;
	bytes32 public lastTransactionHash;
	uint public nextTransactionToBeMined;
	uint public lastTransactionToBeMined;
	
	uint private numberOfLogs;
	
	struct User {
	    // Adresse (hash) de l'utilisateur
	    bytes32 userAddress;
		// Montant de QC que possède l'utilisateur
		uint coins;
		// Adresses des transactions de l'utilisateur
		mapping (uint => uint) transactions;
		// Nombre de transactions
		uint userNumberOfTransactionsInLedger;
	}

	struct Transaction {
		// Hash de la transaction précédente
		bytes32 previousTransactionHash;
		// Expéditeur de la transaction
		bytes32 sender;
		// Destinataire
		bytes32 receiver;
		// Montant
		uint amount;
		// Nonce tel que sha3(T) < difficulty
		// où T est la transaction elle-même.
		uint nonce;
		// TODO : rajouter sender_signature et receiver_signature avec
		// un algo de chiffrement asymétrique
	}

	// Résolution adresse Ethereum --> adresse sha256
	mapping (address => bytes32) public resolveAddress;
	// Ensemble des utilisateurs,
	// agit comme une table de hachage
	mapping (bytes32 => User) public users;
	// Ensemble des transactions validées
	mapping (uint => Transaction) public transactionsLedger;
	// Ensemble des transactions non validées
	mapping (uint => Transaction) public transactionsToBeMined;
	
	// Les "event"s permettent aux clients "légers"
	// de réagir aux changements de manière efficace
	event Sent(bytes32 from, bytes32 to, uint amount);
	// Pour faire des logs par exemple
	event DebugLog(uint logNumber, string message);
	event DebugLogHash(uint logNumber, string message, bytes32 hash);

	// Constructeur du contrat, n'est appelé que
	// lors de la création du contrat
	function QuantumCoin(uint difficulty) public {
		// Le mineur est le créateur du contrat, ce
		// sera le seul à pouvoir miner la monnaie
		minter = msg.sender;
		// Difficulté de la PoW (puissance de deux)
		powDifficulty = difficulty;
		// Nombre total de transactions dans le ledger
		// on laisse la première transaction nulle, celle-ci
		// servira de "transaction nulle/erreur"
		numberOfTransactionsInLedger = 1;
		// Nombre de logs
		numberOfLogs = 0;
		// Hash de la dernière transaction effectuée
		lastTransactionHash = 0x0;

		emit DebugLog(numberOfLogs++, "QuantumCoin créé et initialisé !");
	}

	function checkPow(bytes32 previousTransactionHash, bytes32 sender, bytes32 receiver, uint amount, uint nonce) public returns (bool) {
		uint tmp = uint(previousTransactionHash) + uint(sender) + uint(receiver) + amount + nonce;
		bytes32 hash = sha256(tmp);
		emit DebugLogHash(numberOfLogs++, "Vérification de la PoW", hash);
		
		if (uint(hash) < 2**powDifficulty) {
		    lastTransactionHash = hash;
		    return true;
		}
		
		return  false;
	}

	function mint(bytes32 receiver, uint amount, uint validNonce) public {
		// Seul le compte qui a créé le contrat peut ajouter des coins
		require(msg.sender == minter);
		// Création de la transaction (expéditeur = 0 <=> création de QC)
		Transaction memory t = Transaction({previousTransactionHash: lastTransactionHash, sender: 0x0,
						    receiver: receiver,
						    amount: amount, nonce: validNonce});

		// Vérification de la Pow
		assert(checkPow(t.previousTransactionHash, t.sender, t.receiver, t.amount, t.nonce));

		emit DebugLog(numberOfLogs++, "[Minting] PoW vérifiée !");

		// Arrivés ici, on a une transaction "qui a la bonne forme", on l'ajoute à la chaîne
		transactionsLedger[numberOfTransactionsInLedger] = t;
		// Ajout des coins et de la transaction dans le portefeuille du destinataire
		users[receiver].coins += amount;
		users[receiver].transactions[users[receiver].userNumberOfTransactionsInLedger++] = numberOfTransactionsInLedger;
		// Mise à jour du nombre de transactions au total
		numberOfTransactionsInLedger++;
	}

	function mineNextTransaction(uint validNonce) public {
		Transaction memory _t = transactionsToBeMined[nextTransactionToBeMined];
		Transaction memory t = Transaction({previousTransactionHash: lastTransactionHash, sender: _t.sender,
						    receiver: _t.receiver,
						    amount: _t.amount, nonce: validNonce});
		
		// Vérification de la Pow
		assert(checkPow(t.previousTransactionHash, t.sender, t.receiver, t.amount, t.nonce));

		emit DebugLog(numberOfLogs++, "[Mining] PoW vérifiée !");
		// Arrivés ici, on a une transaction "qui a la bonne forme", on l'ajoute à la chaîne
		transactionsLedger[numberOfTransactionsInLedger] = t;
		// Ajout des coins et de la transaction dans le portefeuille du destinataire
		users[t.receiver].coins += t.amount;
		users[t.receiver].transactions[users[t.receiver].userNumberOfTransactionsInLedger++] = numberOfTransactionsInLedger;
		// Ajout de la transaction dans le portefeuille de l'expéditeur
		users[t.sender].transactions[users[t.sender].userNumberOfTransactionsInLedger++] = numberOfTransactionsInLedger;
		// Mise à jour du nombre de transactions au total
		numberOfTransactionsInLedger++;
		// Mise à jour de la pile des transactions non validées
		nextTransactionToBeMined++;
	}

	function checkUserCoins(bytes32 usrAddr) public returns (bool) {
		User storage usr = users[usrAddr];
		Transaction memory trans;
		uint tmpCoins = 0;
		
		for (uint i=0; i<usr.userNumberOfTransactionsInLedger; i++) {
			// Pour chaque transaction de l'utilisateur ...
			trans = transactionsLedger[usr.transactions[i]];
			// Si l'utilisateur est le destinataire de la transaction ...
			if (trans.receiver == usr.userAddress) {
				// On ajoute le montant de la transaction à son solde
				tmpCoins += trans.amount;
			} else {
				// Sinon, si il en est l'expéditeur ...
				if (trans.sender == usr.userAddress) {
					// On soustrait le montant à son solde
					tmpCoins -= trans.amount;
				} else {
					// Sinon, cette transaction n'a rien à faire là, on "l'annule"
					users[usrAddr].transactions[i] = 0;
				}
			}
		}

		return (tmpCoins != usr.coins);
	}

	function send(bytes32 receiver, uint amount) public {
		User storage usr = users[resolveAddress[msg.sender]];
		// On vérifie que l'expéditeur peut bien envoyer ce montant
		require(usr.coins >= amount);
		// Envoi du montant
		// TODO : ajouter la signature de la transaction
		// Création de la transaction, ajout de la transaction à la pile des transactions non validées (nonce nul)
		Transaction memory t = Transaction({previousTransactionHash: 0x0, sender: usr.userAddress,
						    receiver: receiver,
						    amount: amount, nonce: 0});
		transactionsToBeMined[lastTransactionToBeMined++] = t;
		// On enlève directement les QC du portefeuille de l'expéditeur, même si la transaction n'est pas encore validée
		// pour éviter de dépenser plus que disponible.
		usr.coins -= amount;
		
		emit Sent(usr.userAddress, receiver, amount);
	}

	function newUser() public {
		bytes32 hash = sha256(msg.sender);
		resolveAddress[msg.sender] = hash;
		users[hash] = User({coins: 0, userAddress: hash, userNumberOfTransactionsInLedger: 0});
		emit DebugLog(numberOfLogs++, "Utilisateur créé !");
	}
}
