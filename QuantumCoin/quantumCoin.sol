pragma solidity ^0.4.21;

contract QuantumCoin {
	/* Le mot clé "public" rend ces variables
	   visibles depuis l'extérieur
	   Toutes les variables sont expliquées dans le constructeur */
	address public minter;
	uint public powDifficulty;
	uint public numberOfTransactionsInLedger;
	bytes32 public lastTransactionHash;
	uint public nextTransactionToBeMined;
	uint public lastTransactionToBeMined;

	uint private numberOfLogs;

	/* Structure Utilisateur */
	struct User {
		/* Adresse (hash) de l'utilisateur (deprecated) */
		bytes32 userAddress;
		/* Montant de QC que possède l'utilisateur */
		uint coins;
		/* Adresses des transactions de l'utilisateur */
		mapping (uint => uint) transactions;
		/* Nombre de transactions */
		uint userNumberOfTransactionsInLedger;
	}
/*
	struct EthSignature {
		 * Signature dans Ethereum : triplet (v, r, s)
		 * 
		 * (r, s) est la signature ECDSA
		 * v est un paramètre supplémentaire 
		uint8 v;
		bytes32 r;
		bytes32 s;
	}
*/
	/* Structure d'une transaction, "blockchain dans la blockchain" */
	struct Transaction {
		/* Hash de la transaction précédente */
		bytes32 previousTransactionHash;
		/* Expéditeur de la transaction */
		bytes32 sender;
		/* Destinataire */
		bytes32 receiver;
		/* Montant */
		uint amount;
		/* Nonce tel que h(T) < difficulty
		 * où T est la transaction elle-même et
		 * h est une fonction de hachage (possiblement "quantum-restitante") */
		uint nonce;
		/* Signature de la transaction :
		 * On utilise ici ECDSA fourni par Ethereum mais on peut le remplacer
		 * par une signature à l'aide de n'importe quel chiffrement asymétrique.
		 * ce que l'on signe est la valeur :
		 * sender + receiver + amount + lastTransactionToBeMined */
		uint8 v;
		bytes32 r;
		bytes32 s;
	}

	/* Résolution/registre : adresse Ethereum --> adresse sha256 */
	mapping (address => bytes32) public resolveAddress;
	/* Ensemble des utilisateurs,
	 * agit comme une table de hachage */
	mapping (bytes32 => User) public users;
	/* Ensemble des transactions validées */
	mapping (uint => Transaction) public transactionsLedger;
	/* Ensemble des transactions non validées
	 * (qui doivent être minées) */
	mapping (uint => Transaction) public transactionsToBeMined;

	/* Les "event"s permettent aux clients "légers"
	 * de réagir aux changements de manière efficace en
	 * recevant une "notificaiton" */
	event Sent(bytes32 from, bytes32 to, uint amount);
	/* Pour faire des logs par exemple */
	event DebugLog(uint logNumber, string message);
	event DebugLogHash(uint logNumber, string message, bytes32 hash);

	/* Constructeur du contrat, n'est appelé que lors de
	 * la création du contrat et initialise les champs */
	function QuantumCoin(uint difficulty) public {
		/* Le mineur est le créateur du contrat, ce
		 * sera le seul à pouvoir créer de la monnaie */
		minter = msg.sender;
		/* Difficulté de la PoW (puissance de deux) */
		powDifficulty = difficulty;
		/* Nombre total de transactions dans le ledger
		 * on laisse la première transaction nulle, celle-ci
		 * servira de "transaction nulle/erreur" */
		numberOfTransactionsInLedger = 1;
		/* Nombre de logs (pour les lire dans l'ordre) */
		numberOfLogs = 0;
		/* Hash de la dernière transaction effectuée */
		lastTransactionHash = 0x0;

		emit DebugLog(numberOfLogs++, "QuantumCoin créé et initialisé !");
	}

	function hash(uint val) private pure returns (bytes32) {
		/* On peut réécrire ici notre propre fonction de hachage */
		return sha256(val);
	}

	function checkPow(bytes32 previousTransactionHash, bytes32 sender, bytes32 receiver,
			  uint amount, uint nonce) public returns (bool) {
		/* Vérification de la PoW */
		uint tmp = uint(previousTransactionHash) + uint(sender)
			 + uint(receiver) + amount + nonce;
		bytes32 h = hash(tmp);
		emit DebugLogHash(numberOfLogs++, "Vérification de la PoW", h);

		if (uint(h) < 2**powDifficulty) {
			lastTransactionHash = h;
			return true;
		}

		return  false;
	}

	function mint(bytes32 _receiver, uint _amount, uint _validNonce) public {
		/* Seul le compte qui a créé le contrat peut ajouter des QC */
		require(msg.sender == minter);
		/* Création de la transaction ((expéditeur = 0x0 et signature vide) <=> création de QC) */
		Transaction memory t = Transaction({previousTransactionHash: lastTransactionHash,
						    sender: 0x0,
						    receiver: _receiver,
						    amount: _amount,
						    nonce: _validNonce,
						    v: 0, r: 0x0, s: 0x0});

		/* Vérification de la Pow */
		if (checkPow(t.previousTransactionHash, t.sender, t.receiver, t.amount, t.nonce) == false)
			return;

		emit DebugLog(numberOfLogs++, "[Minting] PoW vérifiée !");

		/* Arrivés ici, on a une transaction "qui a la bonne forme",
		   on l'ajoute à la chaîne */
		transactionsLedger[numberOfTransactionsInLedger] = t;
		/* Ajout des coins et de la transaction dans le portefeuille du destinataire */
		users[_receiver].coins += _amount;
		users[_receiver].transactions[users[_receiver].userNumberOfTransactionsInLedger++] = numberOfTransactionsInLedger;
		/* Mise à jour du nombre de transactions au total */
		numberOfTransactionsInLedger++;
	}

	function mineNextTransaction(uint validNonce) public {
		/* Miner la transaction suivante, principe :
		 * À tout moment, les utilisateurs peuvent accéder aux informations
		 * de la transaction non minée la plus ancienne et peuvent faire la PoW
		 * pour soumettre un nonce qui est validé, ou non, par le contrat. Si
		 * le nonce est valide, la transaction est ajoutée et la transaction non
		 * minée est mise à jour. L'idée peut facilement être élargie à un bloc de
		 * transactions. */
		Transaction memory _t = transactionsToBeMined[nextTransactionToBeMined];
		Transaction memory t = Transaction({previousTransactionHash: lastTransactionHash,
						    sender: _t.sender,
						    receiver: _t.receiver,
						    amount: _t.amount,
						    nonce: validNonce,
		                    		    v: _t.v, r: _t.r, s: _t.s});

		/* Vérification de la Pow (Solidity ne supporte pas encore le passage de
		 * structures en argument de fonctions, il faut donc lui donner les
		 * arguments un à un). */
		if (checkPow(t.previousTransactionHash, t.sender, t.receiver, t.amount, t.nonce) == false)
			return;

		emit DebugLog(numberOfLogs++, "[Mining] PoW vérifiée !");
		/* Arrivés ici, on a une transaction "qui a la bonne forme",
		 * on l'ajoute à la chaîne */
		transactionsLedger[numberOfTransactionsInLedger] = t;
		/* Ajout des coins et de la transaction dans le portefeuille du destinataire */
		users[t.receiver].coins += t.amount;
		users[t.receiver].transactions[users[t.receiver].userNumberOfTransactionsInLedger++] = numberOfTransactionsInLedger;
		/* Ajout de la transaction dans le portefeuille de l'expéditeur */
		users[t.sender].transactions[users[t.sender].userNumberOfTransactionsInLedger++] = numberOfTransactionsInLedger;
		/* Mise à jour du nombre de transactions au total */
		numberOfTransactionsInLedger++;
		/* Mise à jour de la pile des transactions non validées */
		nextTransactionToBeMined++;
		/* Récompense du mineur (pour le faire proprement, il faudrait créer une nouvvelle transaction...) */
		users[resolveAddress[msg.sender]].coins += 1;
	}

	function checkUserCoins(bytes32 usrAddr) public returns (bool) {
		/* DEBUG : Permet de vérifier si le portefeuille d'un utilisateur ne
		 *         contient pas d'incohérences, fonction pas opti à éviter
		 *	   dans la mesure du possible. */
		User storage usr = users[usrAddr];
		Transaction memory t;
		uint tmpCoins = 0;

		for (uint i=0; i<usr.userNumberOfTransactionsInLedger; i++) {
			/* Pour chaque transaction de l'utilisateur ... */
			t = transactionsLedger[usr.transactions[i]];
			/* Si l'utilisateur est le destinataire de la transaction ... */
			if (t.receiver == usr.userAddress) {
				/* On ajoute le montant de la transaction à son solde */
				tmpCoins += t.amount;
			} else {
				/* Sinon, si il en est l'expéditeur ... */
				if (t.sender == usr.userAddress) {
					/* On soustrait le montant à son solde */
					tmpCoins -= t.amount;
				} else {
					/* Sinon, cette transaction n'a rien à faire là,
					 * on "l'annule", i.e. on l'invalide */
					users[usrAddr].transactions[i] = 0;
				}
			}
		}

		return (tmpCoins == usr.coins);
	}

	function checkSignature(bytes32 _message, uint8 _v, bytes32 _r, bytes32 _s, address _addr) public pure returns (bool) {
		/* Les messages signés avec l'API sont de la forme h(prefix||msg)
		 *
		 * Où || est l'opération de concaténation et prefix est de la forme "\x19Ethereum Signed Message:\n" + len(msg) */
		bytes memory prefix = "\x19Ethereum Signed Message:\n32";
		bytes32 prefixedHash = keccak256(prefix, _message);
		/* Cette fonction renvoie l'expéditeur de la signature du hash */
		address signer = ecrecover(prefixedHash, _v, _r, _s);
		
		return (signer == _addr);
	}

	function send(bytes32 receiver, uint amount, uint8 _v, bytes32 _r, bytes32 _s) public {
		bytes32 senderResolved = resolveAddress[msg.sender];
		/* Envoi de coins entre deux utilisateurs */
		User storage usr = users[senderResolved];
		/* On vérifie que l'utilisateur ne s'envoit pas de coins à lui-même 
		   (peut créer des incohérences) */
		require(senderResolved != receiver);
		/* On vérifie que l'expéditeur peut bien envoyer ce montant */
		require(usr.coins >= amount);
		/* On vérifie que l'expéditeur est bien celui qu'il prétend être
		 * (on ajoute lastTransactionToBeMined pour ne pas que quelqu'un
		 * qui intercepte la signature soit en mesure de reproduite la transaction
		 * autant qu'il le souhaite. Ici on se base sur le fait que lastTransactionToBeMined
		 * est augmenté suffisament lentement pour qu'il n'y ait pas de conflit) */
		uint tmp = uint(senderResolved) + uint(receiver) + amount + lastTransactionToBeMined;
		if (checkSignature(hash(tmp), _v, _r, _s, msg.sender) == false) {
			emit DebugLog(numberOfLogs++, "Echec de la vérification de la signature.");	
			return;
		}
		/* Envoi du montant :
		 * Création de la transaction, ajout de la transaction à la pile des
		 * transactions non validées (nonce nul) */
		Transaction memory t = Transaction({previousTransactionHash: 0x0,
						    sender: usr.userAddress,
						    receiver: receiver,
						    amount: amount,
						    nonce: 0,
						    v: _v, r: _r, s: _s});
		transactionsToBeMined[lastTransactionToBeMined++] = t;
		/* On enlève directement les QC du portefeuille de l'expéditeur,
		 * même si la transaction n'est pas encore validée, pour éviter
		 * de dépenser plus que disponible */
		usr.coins -= amount;

		emit Sent(usr.userAddress, receiver, amount);
	}

	function newUser() public {
		/* Ajout d'un nouvel utilisateur dans la base de donnée */
		bytes32 h = hash(uint256(msg.sender));
		resolveAddress[msg.sender] = h;
		users[h] = User({coins: 0, userAddress: h, userNumberOfTransactionsInLedger: 0});
		emit DebugLog(numberOfLogs++, "Utilisateur créé !");
	}
}
