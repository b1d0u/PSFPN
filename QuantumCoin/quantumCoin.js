pragma solidity ^0.4.21;

contract QuantumCoinV4 {
	// Le mot clé "public" rend ces variables
	// visibles depuis l'extérieur
	// Toutes les variables sont expliquées dans le constructeur
	address public mineur;
	string public adminName;
	uint public powDifficulty;
	uint public numberOfTransactionsInLedger;
	bytes32 public lastTransactionHash;
	
	uint private numberOfLogs;
	
	struct User {
		// Montant de QC que possède l'utilisateur
		uint coins;
		// Adresse de l'utilisateur (hash)
		bytes32 userAddress;
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

	// Ensemble des utilisateurs,
	// agit comme une table de hachage
	mapping (address => User) public users;
	// Ensemble des transactions
	mapping(uint => Transaction) public transactionsLedger;
	
	// Les "event"s permettent aux clients "légers"
	// de réagir aux changements de manière efficace
	event Sent(address from, address to, uint amount);
	// Pour faire des logs par exemple
	event DebugLog(uint logNumber, string message);
	event DebugLogHash(uint logNumber, string message, bytes32 hash);

	// Constructeur du contrat, n'est appelé que
	// lors de la création du contrat
	function QuantumCoinV4(string coinAdminName, uint difficulty) public {
		// Le mineur est le créateur du contrat, ce
		// sera le seul à pouvoir miner la monnaie
		mineur = msg.sender;
		// On peut ajouter ici tous ce qui est
		// nécessaire à l'initialisation des
		// fonctions de hash/chiffrement que l'on
		// va utiliser
		adminName = coinAdminName;
		// Difficulté de la PoW (puissance de deux)
		powDifficulty = difficulty;
		// Nombre total de transactions dans le ledger
		numberOfTransactionsInLedger = 0;
		// Nombre de logs
		numberOfLogs = 0;
		// Hash de la dernière transaction effectuée
		lastTransactionHash = 0x0;

		emit DebugLog(numberOfLogs++, "QuantumCoin créé et initialisé !");
	}

	function checkPow(bytes32 previousTransactionHash, bytes32 sender, bytes32 receiver, uint amount, uint nonce) public returns (bool) {
		uint tmp = uint(previousTransactionHash) + uint(sender) + uint(receiver) + amount + nonce;
		bytes32 hash = sha256(tmp);
		emit DebugLogHash(numberOfLogs++, "Hash du check de la PoW", hash);
		
		if (uint(hash) < 2**powDifficulty) {
		    lastTransactionHash = hash;
		    return true;
		}
		
		return  false;
	}

	function mint(address receiver, uint amount, uint validNonce) public {
		// Création de la transaction (expéditeur = 0 <=> création de QC)
		Transaction memory t = Transaction({previousTransactionHash: lastTransactionHash, sender: 0,
						    receiver: users[receiver].userAddress,
						    amount: amount, nonce: validNonce});

		if (!checkPow(t.previousTransactionHash, t.sender, t.receiver, t.amount, t.nonce))
			return;
		emit DebugLog(numberOfLogs++, "PoW vérifiée !");

		// Arrivé ici, on a une transaction "qui a la bonne forme", on l'ajoute à la chaîne
		transactionsLedger[numberOfTransactionsInLedger] = t;
		// Ajout des coins et de la transaction dans le portefeuille du destinataire
		users[receiver].coins += amount;
		users[receiver].transactions[users[receiver].userNumberOfTransactionsInLedger++] = numberOfTransactionsInLedger;
		numberOfTransactionsInLedger++;
	}

	function send(address receiver, uint amount) public {
		// On vérifie que l'expéditeur peut bien envoyer ce montant
		if (users[msg.sender].coins < amount) return;
		// Envoi du montant
		// TODO : ajouter une transaction dans le ledger, ajouter la signature de la transaction
		/**
		 * C'EST ICI QUE L'ON PEUT AJOUTER UNE FONCTION
		 * DE CHIFFREMENT/SIGNATURE RÉSISTANTE À L'ORDINATEUR QUANTIQUE !
		 **/
		users[msg.sender].coins -= amount;
		users[receiver].coins += amount;

		emit Sent(msg.sender, receiver, amount);
	}

	function newUser() public {
		users[msg.sender] = User({coins: 0, userAddress: sha256(msg.sender), userNumberOfTransactionsInLedger: 0});
		emit DebugLog(numberOfLogs++, "Utilisateur créé !");
	}
}
